import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateSaleReturnItemDto } from './dto/create-sale-return-item.dto';
import { UpdateSaleReturnItemDto } from './dto/update-sale-return-item.dto';

@Injectable()
export class SaleReturnItemsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // CREAR ITEM DE DEVOLUCIÓN
  // ============================================================

  async create(
    dto: CreateSaleReturnItemDto,
  ) {
    const saleReturn =
      await this.prisma.saleReturn.findUnique({
        where: {
          id: dto.saleReturnId,
        },
      });

    if (!saleReturn) {
      throw new NotFoundException(
        'Sale return header not found',
      );
    }

    if (saleReturn.status !== 'DRAFT') {
      throw new ConflictException(
        'Only DRAFT returns can receive items',
      );
    }

    /*
     * Validar cantidad
     */

    const quantity =
      Number(dto.quantity);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      throw new ConflictException(
        'Return quantity must be greater than zero',
      );
    }

    /*
     * Buscar venta original
     */

    const saleItem =
      await this.prisma.saleItem.findUnique({
        where: {
          id: dto.saleItemId,
        },

        include: {
          product: true,
          sale: true,
        },
      });

    if (!saleItem) {
      throw new NotFoundException(
        'Original sale item not found',
      );
    }

    /*
     * La venta original debe pertenecer
     * a la misma organización.
     */

    if (
      saleItem.sale.organizationId !==
      saleReturn.organizationId
    ) {
      throw new ConflictException(
        'Original sale does not belong to the return organization',
      );
    }

    /*
     * La venta debe estar confirmada.
     */

    if (
      saleItem.sale.status !==
      'CONFIRMED'
    ) {
      throw new ConflictException(
        'Only items from CONFIRMED sales can be returned',
      );
    }

    /*
     * La venta y devolución deben
     * pertenecer a la misma sucursal.
     */

    if (
      saleItem.sale.branchId !==
      saleReturn.branchId
    ) {
      throw new ConflictException(
        'Original sale and return must belong to the same branch',
      );
    }

    /*
     * El producto enviado debe ser
     * exactamente el producto vendido.
     */

    if (
      dto.productId !==
      saleItem.productId
    ) {
      throw new ConflictException(
        'Return product does not match original sale item',
      );
    }

    /*
     * ----------------------------------------------------------
     * DEVOLUCIONES ANTERIORES
     * ----------------------------------------------------------
     */

    const previousReturns =
      await this.prisma.saleReturnItem.aggregate({
        where: {
          saleItemId:
            dto.saleItemId,

          saleReturn: {
            status: 'COMPLETED',
          },
        },

        _sum: {
          quantity: true,
        },
      });

    const alreadyReturned =
      Number(
        previousReturns._sum.quantity ||
          0,
      );

    const originalQuantity =
      Number(saleItem.quantity);

    /*
     * ----------------------------------------------------------
     * VALIDACIÓN ACUMULADA
     * ----------------------------------------------------------
     */

    if (
      alreadyReturned +
        quantity >
      originalQuantity
    ) {
      throw new ConflictException(
        `Cannot return more than originally sold. Sold: ${originalQuantity}, Already returned: ${alreadyReturned}, Requested: ${quantity}, Remaining: ${originalQuantity - alreadyReturned}`,
      );
    }

    /*
     * ----------------------------------------------------------
     * VALIDAR COSTO
     * ----------------------------------------------------------
     */

    const unitCost =
      Number(dto.unitCost);

    if (
      !Number.isFinite(unitCost) ||
      unitCost < 0
    ) {
      throw new ConflictException(
        'Unit cost must be a valid non-negative number',
      );
    }

    /*
     * ----------------------------------------------------------
     * CREAR ITEM
     * ----------------------------------------------------------
     */

    const newItem =
      await this.prisma.saleReturnItem.create({
        data: {
          saleReturnId:
            dto.saleReturnId,

          saleItemId:
            dto.saleItemId,

          productId:
            dto.productId,

          quantity,

          unitCost,

          notes:
            dto.notes,
        },

        include: {
          product: true,
          saleItem: true,
        },
      });

    /*
     * Recalcular encabezado
     */

    await this.recalculateReturnHeaderTotals(
      dto.saleReturnId,
    );

    return newItem;
  }

  // ============================================================
  // LISTAR
  // ============================================================

  async findAll() {
    return this.prisma.saleReturnItem.findMany({
      include: {
        product: true,
        saleItem: true,
      },
    });
  }

  // ============================================================
  // CONSULTAR
  // ============================================================

  async findOne(id: string) {
    const item =
      await this.prisma.saleReturnItem.findUnique({
        where: {
          id,
        },

        include: {
          product: true,
          saleItem: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Sale return item not found',
      );
    }

    return item;
  }

  // ============================================================
  // ACTUALIZAR
  // ============================================================

  async update(
    id: string,
    dto: UpdateSaleReturnItemDto,
  ) {
    const item =
      await this.prisma.saleReturnItem.findUnique({
        where: {
          id,
        },

        include: {
          saleItem: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Item not found',
      );
    }

    const saleReturn =
      await this.prisma.saleReturn.findUnique({
        where: {
          id:
            item.saleReturnId,
        },
      });

    if (!saleReturn) {
      throw new NotFoundException(
        'Sale return not found',
      );
    }

    if (saleReturn.status !== 'DRAFT') {
      throw new ConflictException(
        'Only DRAFT returns can be modified',
      );
    }

    /*
     * Si cambia la cantidad,
     * validar nuevamente el límite.
     */

    const newQuantity =
      dto.quantity !== undefined
        ? Number(dto.quantity)
        : Number(item.quantity);

    if (
      !Number.isFinite(newQuantity) ||
      newQuantity <= 0
    ) {
      throw new ConflictException(
        'Return quantity must be greater than zero',
      );
    }

    const originalQuantity =
      Number(
        item.saleItem.quantity,
      );

    /*
     * Buscar otras devoluciones COMPLETED.
     *
     * La devolución actual no puede contar
     * porque todavía está DRAFT.
     */

    const previousReturns =
      await this.prisma.saleReturnItem.aggregate({
        where: {
          saleItemId:
            item.saleItemId,

          saleReturn: {
            status: 'COMPLETED',
          },
        },

        _sum: {
          quantity: true,
        },
      });

    const alreadyReturned =
      Number(
        previousReturns._sum.quantity ||
          0,
      );

    if (
      alreadyReturned +
        newQuantity >
      originalQuantity
    ) {
      throw new ConflictException(
        `Cannot return more than originally sold. Sold: ${originalQuantity}, Already returned: ${alreadyReturned}, Requested: ${newQuantity}`,
      );
    }

    /*
     * Costo
     */

    const unitCost =
      dto.unitCost !== undefined
        ? Number(dto.unitCost)
        : Number(item.unitCost);

    if (
      !Number.isFinite(unitCost) ||
      unitCost < 0
    ) {
      throw new ConflictException(
        'Unit cost must be valid',
      );
    }

    const updated =
      await this.prisma.saleReturnItem.update({
        where: {
          id,
        },

        data: {
          quantity:
            newQuantity,

          unitCost,

          notes:
            dto.notes !== undefined
              ? dto.notes
              : item.notes,
        },

        include: {
          product: true,
          saleItem: true,
        },
      });

    await this.recalculateReturnHeaderTotals(
      item.saleReturnId,
    );

    return updated;
  }

  // ============================================================
  // ELIMINAR
  // ============================================================

  async remove(id: string) {
    const item =
      await this.prisma.saleReturnItem.findUnique({
        where: {
          id,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Item not found',
      );
    }

    const saleReturn =
      await this.prisma.saleReturn.findUnique({
        where: {
          id:
            item.saleReturnId,
        },
      });

    if (!saleReturn) {
      throw new NotFoundException(
        'Sale return not found',
      );
    }

    if (saleReturn.status !== 'DRAFT') {
      throw new ConflictException(
        'Only DRAFT returns can be modified',
      );
    }

    await this.prisma.saleReturnItem.delete({
      where: {
        id,
      },
    });

    await this.recalculateReturnHeaderTotals(
      item.saleReturnId,
    );

    return {
      message:
        'Return item removed successfully from the credit note.',
    };
  }

  // ============================================================
  // RECALCULAR TOTALES
  // ============================================================

  private async recalculateReturnHeaderTotals(
    saleReturnId: string,
  ) {
    const items =
      await this.prisma.saleReturnItem.findMany({
        where: {
          saleReturnId,
        },
      });

    const subtotal =
      items.reduce(
        (acc, item) =>
          acc +
          item.quantity *
            Number(item.unitCost),
        0,
      );

    await this.prisma.saleReturn.update({
      where: {
        id: saleReturnId,
      },

      data: {
        subtotal,
        total: subtotal,
      },
    });
  }
}
