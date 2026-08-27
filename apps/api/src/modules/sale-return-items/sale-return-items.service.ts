import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateSaleReturnItemDto } from './dto/create-sale-return-item.dto';
import { UpdateSaleReturnItemDto } from './dto/update-sale-return-item.dto';

@Injectable()
export class SaleReturnItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSaleReturnItemDto) {
    const saleReturn = await this.prisma.saleReturn.findUnique({ where: { id: dto.saleReturnId } });
    if (!saleReturn) throw new NotFoundException('Sale return header not found');
    if (saleReturn.status !== 'DRAFT') throw new ConflictException('Only DRAFT returns can receive items');

    const saleItem = await this.prisma.saleItem.findUnique({ where: { id: dto.saleItemId } });
    if (!saleItem) throw new NotFoundException('Original sale item not found');

    // Validación preventiva: Impedir que el cliente devuelva más de lo facturado originalmente
    if (dto.quantity > saleItem.quantity) {
      throw new ConflictException(`Cannot return more items than originally sold (${saleItem.quantity} units)`);
    }

    const newItem = await this.prisma.saleReturnItem.create({
      data: {
        saleReturnId: dto.saleReturnId,
        saleItemId: dto.saleItemId,
        productId: dto.productId,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        notes: dto.notes,
      },
    });

    await this.recalculateReturnHeaderTotals(dto.saleReturnId);
    return newItem;
  }

  async findAll() {
    return this.prisma.saleReturnItem.findMany({ include: { product: true } });
  }

  async findOne(id: string) {
    const item = await this.prisma.saleReturnItem.findUnique({ where: { id }, include: { product: true } });
    if (!item) throw new NotFoundException('Sale return item not found');
    return item;
  }

  async update(id: string, dto: UpdateSaleReturnItemDto) {
    const item = await this.prisma.saleReturnItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');

    const saleReturn = await this.prisma.saleReturn.findUnique({ where: { id: item.saleReturnId } });
    if (saleReturn?.status !== 'DRAFT') throw new ConflictException('Only DRAFT returns can be modified');

    const updated = await this.prisma.saleReturnItem.update({
      where: { id },
      data: dto as any,
    });

    await this.recalculateReturnHeaderTotals(item.saleReturnId);
    return updated;
  }

  async remove(id: string) {
    const item = await this.prisma.saleReturnItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');

    const saleReturn = await this.prisma.saleReturn.findUnique({ where: { id: item.saleReturnId } });
    if (saleReturn?.status !== 'DRAFT') throw new ConflictException('Only DRAFT returns can be modified');

    await this.prisma.saleReturnItem.delete({ where: { id } });
    await this.recalculateReturnHeaderTotals(item.saleReturnId);

    return { message: 'Return item removed successfully from the credit note.' };
  }

  // Recalculo financiero nativo directo en Prisma sin inyecciones circulares
  private async recalculateReturnHeaderTotals(saleReturnId: string) {
    const items = await this.prisma.saleReturnItem.findMany({ where: { saleReturnId } });

    const subtotal = items.reduce((acc, item) => acc + (item.quantity * Number(item.unitCost)), 0);
    const total = subtotal;

    await this.prisma.saleReturn.update({
      where: { id: saleReturnId },
      data: {
        subtotal,
        total,
      },
    });
  }
}
