import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KitchenStatus, SaleStatus, TableStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateRestaurantOrderDto } from './dto/create-restaurant-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class RestaurantOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // AGREGAR PRODUCTOS / CREAR COMANDA DE MESA
  // ============================================================

  async addItemsToTable(tableId: string, dto: CreateRestaurantOrderDto) {
    const { organizationId, branchId, items } = dto;

    const table = await this.prisma.restaurantTable.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return this.prisma.$transaction(async (tx) => {
      let saleId = table.currentSaleId;

      if (!saleId || table.status === TableStatus.AVAILABLE) {
        const resolution = await tx.billingResolution.findFirst({
          where: {
            branchId,
            organizationId,
            isActive: true,
          },
        });

        if (!resolution) {
          throw new ConflictException(
            'No active billing resolution found for this branch. Cannot issue orders.',
          );
        }

        if (resolution.currentNumber > resolution.toNumber) {
          throw new ConflictException(
            'The billing resolution has run out of authorized invoice numbers.',
          );
        }

        if (new Date() > new Date(resolution.expiryDate)) {
          throw new ConflictException(
            'The branch billing resolution has expired.',
          );
        }

        const assignedSaleNumber = `${resolution.prefix}-${resolution.currentNumber}`;

        await tx.billingResolution.update({
          where: { id: resolution.id },
          data: {
            currentNumber: { increment: 1 },
          },
        });

        /*
         * Se asigna DRAFT a status y PENDING a kitchenStatus
         */
        const newSale = await tx.sale.create({
          data: {
            organizationId,
            branchId,
            tableId,
            saleNumber: assignedSaleNumber,
            status: SaleStatus.DRAFT,
            kitchenStatus: KitchenStatus.PENDING, // Initial KDS status
            subtotal: 0,
            discount: 0,
            tax: 0,
            total: 0,
          },
        });

        saleId = newSale.id;

        await tx.restaurantTable.update({
          where: { id: tableId },
          data: {
            currentSaleId: saleId,
            status: TableStatus.OCCUPIED,
          },
        });
      } else if (table.status === TableStatus.BILL_PRINTED) {
        await tx.restaurantTable.update({
          where: { id: tableId },
          data: { status: TableStatus.OCCUPIED },
        });
      }

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(
            `Product [${item.productId}] not found`,
          );
        }

        const unitPrice = Number(product.salePrice);
        const subtotal = unitPrice * item.quantity;

        await tx.saleItem.create({
          data: {
            saleId: saleId!,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            subtotal,
            total: subtotal,
            description: item.notes || null,
          },
        });
      }

      const allItems = await tx.saleItem.findMany({
        where: { saleId: saleId! },
      });

      const subtotalBase = allItems.reduce(
        (acc, item) => acc + item.quantity * Number(item.unitPrice),
        0,
      );

      const totalDiscount = allItems.reduce(
        (acc, item) => acc + Number(item.discount),
        0,
      );

      const totalNeto = subtotalBase - totalDiscount;

      return tx.sale.update({
        where: { id: saleId! },
        data: {
          subtotal: subtotalBase,
          discount: totalDiscount,
          total: totalNeto,
        },
        include: {
          branch: {
            select: { id: true, name: true, code: true },
          },
          customer: true,
          table: true,
          items: {
            include: { product: true },
          },
        },
      });
    });
  }

  // ============================================================
  // CONSULTAR COMANDA ACTIVA DE UNA MESA
  // ============================================================

  async getCurrentOrder(tableId: string) {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { id: tableId },
    });

    if (!table || !table.currentSaleId) {
      return null;
    }

    const sale = await this.prisma.sale.findUnique({
      where: { id: table.currentSaleId },
      include: {
        branch: {
          select: { id: true, name: true, code: true },
        },
        customer: true,
        table: true,
        items: {
          include: { product: true },
        },
      },
    });

    if (!sale || sale.status === SaleStatus.CANCELLED) {
      return null;
    }

    return sale;
  }

  // ============================================================
  // ELIMINAR ÍTEM DE LA COMANDA ACTIVA
  // ============================================================

  async removeItem(itemId: string) {
    const existingItem = await this.prisma.saleItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      throw new NotFoundException('Order item not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedItem = await tx.saleItem.delete({
        where: { id: itemId },
      });

      const remainingItems = await tx.saleItem.findMany({
        where: { saleId: deletedItem.saleId },
      });

      const subtotalBase = remainingItems.reduce(
        (acc, item) => acc + item.quantity * Number(item.unitPrice),
        0,
      );

      const totalDiscount = remainingItems.reduce(
        (acc, item) => acc + Number(item.discount),
        0,
      );

      const totalNeto = subtotalBase - totalDiscount;

      return tx.sale.update({
        where: { id: deletedItem.saleId },
        data: {
          subtotal: subtotalBase,
          discount: totalDiscount,
          total: totalNeto,
        },
        include: {
          branch: {
            select: { id: true, name: true, code: true },
          },
          customer: true,
          table: true,
          items: {
            include: { product: true },
          },
        },
      });
    });
  }

  // ============================================================
  // OBTENER COMANDAS ACTIVAS PARA COCINA (KDS)
  // ============================================================

  async getKitchenOrders() {
    return this.prisma.sale.findMany({
      where: {
        tableId: { not: null },
        kitchenStatus: {
          in: [KitchenStatus.PENDING, KitchenStatus.IN_PREPARATION],
        },
      },
      include: {
        table: true,
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // ============================================================
  // ACTUALIZAR ESTADO DE COMANDA EN COCINA
  // ============================================================

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: orderId },
    });

    if (!sale) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return this.prisma.sale.update({
      where: { id: orderId },
      data: {
        kitchenStatus: dto.status, // <--- Se actualiza kitchenStatus en lugar de status
      },
      include: {
        table: true,
        items: {
          include: { product: true },
        },
      },
    });
  }
}
