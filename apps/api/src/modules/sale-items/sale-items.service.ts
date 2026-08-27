import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateSaleItemDto } from './dto/create-sale-item.dto';
import { UpdateSaleItemDto } from './dto/update-sale-item.dto';

@Injectable()
export class SaleItemsService {
  // Inyectamos únicamente PrismaService, tal como en tus otros módulos de items
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSaleItemDto) {
    const sale = await this.prisma.sale.findUnique({ where: { id: dto.saleId } });
    if (!sale) throw new NotFoundException('Sale header not found');
    if (sale.status !== 'DRAFT') throw new ConflictException('Only DRAFT sales can be modified');

    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    const discountApplied = dto.discount || 0;
    const baseSubtotal = dto.quantity * dto.unitPrice;
    const subtotalNeto = baseSubtotal - discountApplied;

    // 1. Crear el ítem en la base de datos
    const newItem = await this.prisma.saleItem.create({
      data: {
        saleId: dto.saleId,
        productId: dto.productId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        discount: discountApplied,
        subtotal: subtotalNeto,
        total: subtotalNeto,
        description: dto.description || undefined,
      },
    });

    // 2. Recalcular y actualizar la cabecera directamente con Prisma (KNA-055)
    await this.recalculateTotalsDirect(dto.saleId);

    return newItem;
  }

  // Métodos complementarios para el estándar del controlador
  async findAll() {
    return this.prisma.saleItem.findMany();
  }

  async findOne(id: string) {
    const item = await this.prisma.saleItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Sale item not found');
    return item;
  }

  async update(id: string, dto: UpdateSaleItemDto) {
    const item = await this.prisma.saleItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Sale item not found');

    const sale = await this.prisma.sale.findUnique({ where: { id: item.saleId } });
    if (sale?.status !== 'DRAFT') throw new ConflictException('Only DRAFT sales can be modified');

    const quantity = dto.quantity !== undefined ? dto.quantity : item.quantity;
    const unitPrice = dto.unitPrice !== undefined ? dto.unitPrice : Number(item.unitPrice);
    const discount = dto.discount !== undefined ? dto.discount : Number(item.discount);

    const baseSubtotal = quantity * unitPrice;
    const subtotalNeto = baseSubtotal - discount;

    const updatedItem = await this.prisma.saleItem.update({
      where: { id },
      data: {
        quantity,
        unitPrice,
        discount,
        subtotal: subtotalNeto,
        total: subtotalNeto,
        description: dto.description || undefined,
      },
    });

    // Recalcular cabecera
    await this.recalculateTotalsDirect(item.saleId);
    return updatedItem;
  }

  async remove(id: string) {
    const item = await this.prisma.saleItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Sale item not found');

    const sale = await this.prisma.sale.findUnique({ where: { id: item.saleId } });
    if (sale?.status !== 'DRAFT') throw new ConflictException('Only DRAFT sales can be modified');

    await this.prisma.saleItem.delete({ where: { id } });

    // Recalcular cabecera
    await this.recalculateTotalsDirect(item.saleId);

    return { message: 'Item removed successfully from the checkout list.' };
  }

  // Función matemática local para no depender de llamadas de otras carpetas
  private async recalculateTotalsDirect(saleId: string) {
    const items = await this.prisma.saleItem.findMany({
      where: { saleId },
    });

    const subtotalBase = items.reduce((acc, item) => acc + (item.quantity * Number(item.unitPrice)), 0);
    const totalDiscount = items.reduce((acc, item) => acc + Number(item.discount), 0);
    const totalNeto = subtotalBase - totalDiscount;

    await this.prisma.sale.update({
      where: { id: saleId },
      data: {
        subtotal: subtotalBase,
        discount: totalDiscount,
        total: totalNeto,
      },
    });
  }
}
