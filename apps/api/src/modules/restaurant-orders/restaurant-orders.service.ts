import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SaleStatus, TableStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateRestaurantOrderDto } from './dto/create-restaurant-order.dto';

@Injectable()
export class RestaurantOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // AGREGAR PRODUCTOS / CREAR COMANDA DE MESA
  // ============================================================

  async addItemsToTable(tableId: string, dto: CreateRestaurantOrderDto) {
    const { organizationId, branchId, items } = dto;

    /*
     * ----------------------------------------------------------
     * VALIDAR MESA
     * ----------------------------------------------------------
     */

    const table = await this.prisma.restaurantTable.findUnique({
      where: {
        id: tableId,
      },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    /*
     * ----------------------------------------------------------
     * PROCESAR COMANDA EN TRANSACCIÓN
     * ----------------------------------------------------------
     */

    return this.prisma.$transaction(async (tx) => {
      let saleId = table.currentSaleId;

      // Si no hay orden activa vinculada o la mesa está marcada como libre
      if (!saleId || table.status === TableStatus.AVAILABLE) {
        /*
         * Validar resolución de facturación activa para asignar consecutivo DRAFT
         */
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

        /*
         * Avanzar consecutivo de facturación
         */
        await tx.billingResolution.update({
          where: {
            id: resolution.id,
          },
          data: {
            currentNumber: {
              increment: 1,
            },
          },
        });

        /*
         * Crear cabecera DRAFT para la comanda de restaurante
         */
        const newSale = await tx.sale.create({
          data: {
            organizationId,
            branchId,
            tableId,
            saleNumber: assignedSaleNumber,
            status: SaleStatus.DRAFT,
            subtotal: 0,
            discount: 0,
            tax: 0,
            total: 0,
          },
        });

        saleId = newSale.id;

        /*
         * Actualizar la mesa vinculando el saleId activo y marcar como ocupada
         */
        await tx.restaurantTable.update({
          where: {
            id: tableId,
          },
          data: {
            currentSaleId: saleId,
            status: TableStatus.OCCUPIED,
          },
        });
      } else if (table.status === TableStatus.BILL_PRINTED) {
        // Si se agregan nuevos ítems tras haber impreso la precuenta, vuelve a estado OCCUPIED
        await tx.restaurantTable.update({
          where: { id: tableId },
          data: { status: TableStatus.OCCUPIED },
        });
      }

      /*
       * ----------------------------------------------------------
       * REGISTRAR CADA ÍTEM EN SALE_ITEM
       * ----------------------------------------------------------
       */

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },
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

      /*
       * ----------------------------------------------------------
       * RECALCULAR Y ACTUALIZAR TOTALES DE LA COMANDA
       * ----------------------------------------------------------
       */

      const allItems = await tx.saleItem.findMany({
        where: {
          saleId: saleId!,
        },
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
        where: {
          id: saleId!,
        },
        data: {
          subtotal: subtotalBase,
          discount: totalDiscount,
          total: totalNeto,
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          customer: true,
          table: true,
          items: {     // <-- Esto es clave para que el frontend reciba los productos
            include: {
              product: true,
            },
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

    // Permitir la comanda si está en DRAFT o CONFIRMED, solo rechazar si está CANCELLED
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
      where: {
        id: itemId,
      },
    });

    if (!existingItem) {
      throw new NotFoundException('Order item not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const deletedItem = await tx.saleItem.delete({
        where: {
          id: itemId,
        },
      });

      /*
       * Recalcular totales tras eliminar el ítem
       */
      const remainingItems = await tx.saleItem.findMany({
        where: {
          saleId: deletedItem.saleId,
        },
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
        where: {
          id: deletedItem.saleId,
        },
        data: {
          subtotal: subtotalBase,
          discount: totalDiscount,
          total: totalNeto,
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          customer: true,
          table: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    });
  }
}
