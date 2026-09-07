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
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================
  // CREAR ITEM
  // ============================================================
  async create(dto: CreateSaleItemDto) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: dto.saleId },
    });

    if (!sale) {
      throw new NotFoundException('Sale header not found');
    }

    if (sale.status !== 'DRAFT') {
      throw new ConflictException('Only DRAFT sales can be modified');
    }

    const quantity = Number(dto.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ConflictException('Quantity must be greater than zero');
    }

    const unitPrice = Number(dto.unitPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new ConflictException('Unit price must be a valid non-negative number');
    }

    const discount = dto.discount !== undefined ? Number(dto.discount) : 0;
    if (!Number.isFinite(discount) || discount < 0) {
      throw new ConflictException('Discount must be a valid non-negative number');
    }

    const baseTotal = quantity * unitPrice;
    if (discount > baseTotal) {
      throw new ConflictException('Discount cannot exceed item total');
    }

    // 1. Obtener producto e INCLUIR taxRule
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { taxRule: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.organizationId !== sale.organizationId) {
      throw new ConflictException('Product does not belong to sale organization');
    }

    if (!product.isActive) {
      throw new ConflictException('Product is inactive');
    }

    // 2. Extraer IVA del precio con impuesto incluido
    const taxPercentage = product.taxRule ? Number(product.taxRule.percentage) : 0;
    const taxMultiplier = taxPercentage / 100;

    const itemTotal = baseTotal - discount; // Precio final con IVA cobrado al cliente
    const itemSubtotal = itemTotal / (1 + taxMultiplier); // Base imponible sin IVA
    const itemTaxAmount = itemTotal - itemSubtotal; // Valor en $ del IVA

    // 3. Crear ítem con el desglose de IVA completo
    const newItem = await this.prisma.saleItem.create({
      data: {
        saleId: dto.saleId,
        productId: dto.productId,
        quantity,
        unitPrice,
        discount,
        subtotal: itemSubtotal,
        taxPercentage,
        taxAmount: itemTaxAmount,
        total: itemTotal,
        description: dto.description || undefined,
      },
      include: {
        product: {
          include: { taxRule: true },
        },
      },
    });

    // 4. Recalcular cabecera de la venta (incluyendo la columna tax)
    await this.recalculateTotalsDirect(dto.saleId);

    return newItem;
  }

  // ============================================================
  // LISTAR
  // ============================================================
  async findAll() {
    return this.prisma.saleItem.findMany({
      include: {
        product: { include: { taxRule: true } },
      },
    });
  }

  // ============================================================
  // CONSULTAR
  // ============================================================
  async findOne(id: string) {
    const item = await this.prisma.saleItem.findUnique({
      where: { id },
      include: {
        product: { include: { taxRule: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Sale item not found');
    }

    return item;
  }

  // ============================================================
  // ACTUALIZAR
  // ============================================================
  async update(id: string, dto: UpdateSaleItemDto) {
    const item = await this.prisma.saleItem.findUnique({
      where: { id },
      include: {
        product: { include: { taxRule: true } },
      },
    });

    if (!item) {
      throw new NotFoundException('Sale item not found');
    }

    const sale = await this.prisma.sale.findUnique({
      where: { id: item.saleId },
    });

    if (!sale) {
      throw new NotFoundException('Sale header not found');
    }

    if (sale.status !== 'DRAFT') {
      throw new ConflictException('Only DRAFT sales can be modified');
    }

    const quantity = dto.quantity !== undefined ? Number(dto.quantity) : Number(item.quantity);
    const unitPrice = dto.unitPrice !== undefined ? Number(dto.unitPrice) : Number(item.unitPrice);
    const discount = dto.discount !== undefined ? Number(dto.discount) : Number(item.discount);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ConflictException('Quantity must be greater than zero');
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new ConflictException('Unit price must be valid');
    }

    if (!Number.isFinite(discount) || discount < 0) {
      throw new ConflictException('Discount must be valid');
    }

    const baseTotal = quantity * unitPrice;
    if (discount > baseTotal) {
      throw new ConflictException('Discount cannot exceed item total');
    }

    // Extraer IVA con la regla del producto del ítem
    const taxPercentage = item.product?.taxRule ? Number(item.product.taxRule.percentage) : 0;
    const taxMultiplier = taxPercentage / 100;

    const itemTotal = baseTotal - discount;
    const itemSubtotal = itemTotal / (1 + taxMultiplier);
    const itemTaxAmount = itemTotal - itemSubtotal;

    const updatedItem = await this.prisma.saleItem.update({
      where: { id },
      data: {
        quantity,
        unitPrice,
        discount,
        subtotal: itemSubtotal,
        taxPercentage,
        taxAmount: itemTaxAmount,
        total: itemTotal,
        description: dto.description !== undefined ? dto.description : item.description,
      },
      include: {
        product: { include: { taxRule: true } },
      },
    });

    await this.recalculateTotalsDirect(item.saleId);

    return updatedItem;
  }

  // ============================================================
  // ELIMINAR
  // ============================================================
  async remove(id: string) {
    const item = await this.prisma.saleItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Sale item not found');
    }

    const sale = await this.prisma.sale.findUnique({
      where: { id: item.saleId },
    });

    if (!sale) {
      throw new NotFoundException('Sale header not found');
    }

    if (sale.status !== 'DRAFT') {
      throw new ConflictException('Only DRAFT sales can be modified');
    }

    await this.prisma.saleItem.delete({
      where: { id },
    });

    await this.recalculateTotalsDirect(item.saleId);

    return {
      message: 'Item removed successfully from the checkout list.',
    };
  }

  // ============================================================
  // RECALCULAR TOTALES DE LA VENTA
  // ============================================================
  private async recalculateTotalsDirect(saleId: string) {
    const items = await this.prisma.saleItem.findMany({
      where: { saleId },
    });

    const subtotalBase = items.reduce((acc, item) => acc + Number(item.subtotal), 0);
    const totalTax = items.reduce((acc, item) => acc + Number(item.taxAmount), 0);
    const totalDiscount = items.reduce((acc, item) => acc + Number(item.discount), 0);
    const grandTotal = items.reduce((acc, item) => acc + Number(item.total), 0);

    await this.prisma.sale.update({
      where: { id: saleId },
      data: {
        subtotal: subtotalBase,
        tax: totalTax,
        discount: totalDiscount,
        total: grandTotal,
      },
    });
  }
}
