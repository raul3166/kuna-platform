import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KitchenStatus, TableStatus } from '@prisma/client';
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
      let orderId = table.currentOrderId;

      // Si no existe comanda o la mesa está libre, creamos una comanda nueva
      if (!orderId || table.status === TableStatus.AVAILABLE) {
        const newOrder = await tx.restaurantOrder.create({
          data: {
            organizationId,
            branchId,
            tableId,
            status: KitchenStatus.PENDING,
          },
        });

        orderId = newOrder.id;

        await tx.restaurantTable.update({
          where: { id: tableId },
          data: {
            currentOrderId: orderId,
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

        await tx.restaurantOrderItem.create({
          data: {
            restaurantOrderId: orderId!,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
            notes: item.notes || null,
          },
        });
      }

      return tx.restaurantOrder.findUnique({
        where: { id: orderId! },
        include: {
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

    if (!table || !table.currentOrderId) {
      return null;
    }

    return this.prisma.restaurantOrder.findUnique({
      where: { id: table.currentOrderId },
      include: {
        table: true,
        items: {
          include: { product: true },
        },
      },
    });
  }

  // ============================================================
  // ELIMINAR ÍTEM DE LA COMANDA ACTIVA
  // ============================================================

  async removeItem(itemId: string) {
    const existingItem = await this.prisma.restaurantOrderItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      throw new NotFoundException('Order item not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedItem = await tx.restaurantOrderItem.delete({
        where: { id: itemId },
      });

      return tx.restaurantOrder.findUnique({
        where: { id: deletedItem.restaurantOrderId },
        include: {
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
    return this.prisma.restaurantOrder.findMany({
      where: {
        status: {
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
    const order = await this.prisma.restaurantOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return this.prisma.restaurantOrder.update({
      where: { id: orderId },
      data: {
        status: dto.status,
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
