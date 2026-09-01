import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateSaleItemDto } from './dto/create-sale-item.dto';
import { UpdateSaleItemDto } from './dto/update-sale-item.dto';

@Injectable()
export class SaleItemsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // CREAR ITEM
  // ============================================================

  async create(dto: CreateSaleItemDto) {
    const sale =
      await this.prisma.sale.findUnique({
        where: {
          id: dto.saleId,
        },
      });

    if (!sale) {
      throw new NotFoundException(
        'Sale header not found',
      );
    }

    if (sale.status !== 'DRAFT') {
      throw new ConflictException(
        'Only DRAFT sales can be modified',
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
        'Quantity must be greater than zero',
      );
    }

    /*
     * Validar precio
     */

    const unitPrice =
      Number(dto.unitPrice);

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      throw new ConflictException(
        'Unit price must be a valid non-negative number',
      );
    }

    /*
     * Validar descuento
     */

    const discount =
      dto.discount !== undefined
        ? Number(dto.discount)
        : 0;

    if (
      !Number.isFinite(discount) ||
      discount < 0
    ) {
      throw new ConflictException(
        'Discount must be a valid non-negative number',
      );
    }

    const baseSubtotal =
      quantity * unitPrice;

    if (discount > baseSubtotal) {
      throw new ConflictException(
        'Discount cannot exceed item subtotal',
      );
    }

    const subtotalNeto =
      baseSubtotal - discount;

    /*
     * Producto
     */

    const product =
      await this.prisma.product.findUnique({
        where: {
          id: dto.productId,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    if (
      product.organizationId !==
      sale.organizationId
    ) {
      throw new ConflictException(
        'Product does not belong to sale organization',
      );
    }

    if (!product.isActive) {
      throw new ConflictException(
        'Product is inactive',
      );
    }

    /*
     * Crear item
     */

    const newItem =
      await this.prisma.saleItem.create({
        data: {
          saleId:
            dto.saleId,

          productId:
            dto.productId,

          quantity,

          unitPrice,

          discount,

          subtotal:
            subtotalNeto,

          total:
            subtotalNeto,

          description:
            dto.description ||
            undefined,
        },

        include: {
          product: true,
        },
      });

    /*
     * Recalcular cabecera
     */

    await this.recalculateTotalsDirect(
      dto.saleId,
    );

    return newItem;
  }

  // ============================================================
  // LISTAR
  // ============================================================

  async findAll() {
    return this.prisma.saleItem.findMany({
      include: {
        product: true,
      },
    });
  }

  // ============================================================
  // CONSULTAR
  // ============================================================

  async findOne(id: string) {
    const item =
      await this.prisma.saleItem.findUnique({
        where: {
          id,
        },

        include: {
          product: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Sale item not found',
      );
    }

    return item;
  }

  // ============================================================
  // ACTUALIZAR
  // ============================================================

  async update(
    id: string,
    dto: UpdateSaleItemDto,
  ) {
    const item =
      await this.prisma.saleItem.findUnique({
        where: {
          id,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Sale item not found',
      );
    }

    const sale =
      await this.prisma.sale.findUnique({
        where: {
          id: item.saleId,
        },
      });

    if (!sale) {
      throw new NotFoundException(
        'Sale header not found',
      );
    }

    if (sale.status !== 'DRAFT') {
      throw new ConflictException(
        'Only DRAFT sales can be modified',
      );
    }

    const quantity =
      dto.quantity !== undefined
        ? Number(dto.quantity)
        : Number(item.quantity);

    const unitPrice =
      dto.unitPrice !== undefined
        ? Number(dto.unitPrice)
        : Number(item.unitPrice);

    const discount =
      dto.discount !== undefined
        ? Number(dto.discount)
        : Number(item.discount);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      throw new ConflictException(
        'Quantity must be greater than zero',
      );
    }

    if (
      !Number.isFinite(unitPrice) ||
      unitPrice < 0
    ) {
      throw new ConflictException(
        'Unit price must be valid',
      );
    }

    if (
      !Number.isFinite(discount) ||
      discount < 0
    ) {
      throw new ConflictException(
        'Discount must be valid',
      );
    }

    const baseSubtotal =
      quantity * unitPrice;

    if (discount > baseSubtotal) {
      throw new ConflictException(
        'Discount cannot exceed item subtotal',
      );
    }

    const subtotalNeto =
      baseSubtotal - discount;

    const updatedItem =
      await this.prisma.saleItem.update({
        where: {
          id,
        },

        data: {
          quantity,
          unitPrice,
          discount,

          subtotal:
            subtotalNeto,

          total:
            subtotalNeto,

          description:
            dto.description !== undefined
              ? dto.description
              : item.description,
        },

        include: {
          product: true,
        },
      });

    await this.recalculateTotalsDirect(
      item.saleId,
    );

    return updatedItem;
  }

  // ============================================================
  // ELIMINAR
  // ============================================================

  async remove(id: string) {
    const item =
      await this.prisma.saleItem.findUnique({
        where: {
          id,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Sale item not found',
      );
    }

    const sale =
      await this.prisma.sale.findUnique({
        where: {
          id: item.saleId,
        },
      });

    if (!sale) {
      throw new NotFoundException(
        'Sale header not found',
      );
    }

    if (sale.status !== 'DRAFT') {
      throw new ConflictException(
        'Only DRAFT sales can be modified',
      );
    }

    await this.prisma.saleItem.delete({
      where: {
        id,
      },
    });

    await this.recalculateTotalsDirect(
      item.saleId,
    );

    return {
      message:
        'Item removed successfully from the checkout list.',
    };
  }

  // ============================================================
  // RECALCULAR
  // ============================================================

  private async recalculateTotalsDirect(
    saleId: string,
  ) {
    const items =
      await this.prisma.saleItem.findMany({
        where: {
          saleId,
        },
      });

    const subtotalBase =
      items.reduce(
        (acc, item) =>
          acc +
          item.quantity *
            Number(item.unitPrice),
        0,
      );

    const totalDiscount =
      items.reduce(
        (acc, item) =>
          acc + Number(item.discount),
        0,
      );

    const totalNeto =
      subtotalBase - totalDiscount;

    await this.prisma.sale.update({
      where: {
        id: saleId,
      },

      data: {
        subtotal: subtotalBase,
        discount: totalDiscount,
        total: totalNeto,
      },
    });
  }
}
