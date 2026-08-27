import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateSaleReturnDto } from './dto/create-sale-return.dto';
import { UpdateSaleReturnDto } from './dto/update-sale-return.dto';

@Injectable()
export class SaleReturnsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSaleReturnDto) {
    const existing = await this.prisma.saleReturn.findFirst({
      where: { organizationId: dto.organizationId, returnNumber: dto.returnNumber },
    });
    if (existing) throw new ConflictException('Return number already exists');

    return this.prisma.saleReturn.create({
      data: {
        organizationId: dto.organizationId,
        branchId: dto.branchId,
        saleId: dto.saleId,
        customerId: dto.customerId,
        returnNumber: dto.returnNumber,
        returnDate: new Date(dto.returnDate),
        reason: dto.reason,
        notes: dto.notes,
        status: 'DRAFT',
      },
    });
  }

  async findAll() {
    return this.prisma.saleReturn.findMany({
      include: { branch: true, sale: true, customer: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const res = await this.prisma.saleReturn.findUnique({
      where: { id },
      include: { branch: true, sale: true, customer: true, items: { include: { product: true } } },
    });
    if (!res) throw new NotFoundException('Sale return not found');
    return res;
  }

  async update(id: string, dto: UpdateSaleReturnDto) {
    const res = await this.prisma.saleReturn.findUnique({ where: { id } });
    if (!res) throw new NotFoundException('Sale return not found');
    if (res.status !== 'DRAFT') throw new ConflictException('Only DRAFT sale returns can be modified');

    return this.prisma.saleReturn.update({
      where: { id },
      data: dto as any,
    });
  }

  async remove(id: string) {
    const res = await this.prisma.saleReturn.findUnique({ where: { id } });
    if (!res) throw new NotFoundException('Sale return not found');
    if (res.status !== 'DRAFT') throw new ConflictException('Only DRAFT sale returns can be deleted');

    // CORREGIDO: Referencia de borrado directa en Prisma
    return this.prisma.saleReturn.delete({ where: { id } });
  }

  async confirm(id: string) {
    const res = await this.prisma.saleReturn.findUnique({ where: { id }, include: { items: true } });
    if (!res) throw new NotFoundException('Return not found');
    if (res.status !== 'DRAFT') throw new ConflictException('Only DRAFT returns can be confirmed');
    if (res.items.length === 0) throw new ConflictException('Cannot confirm empty returns');

    return this.prisma.saleReturn.update({ where: { id }, data: { status: 'CONFIRMED' } });
  }

  // --- MOTOR CRÍTICO CORREGIDO (KNA-058) ---
  async complete(id: string) {
    const saleReturn = await this.prisma.saleReturn.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!saleReturn) throw new NotFoundException('Sale return not found');
    if (saleReturn.status !== 'CONFIRMED') throw new ConflictException('Only CONFIRMED returns can be completed');

    return this.prisma.$transaction(async (tx) => {
      for (const item of saleReturn.items) {
        let stockRecord = await tx.branchProductStock.findFirst({
          where: { productId: item.productId, branchId: saleReturn.branchId },
        });

        if (!stockRecord) {
          // CORREGIDO: Mapeado al campo 'stock' nativo de tu BranchProductStock
          stockRecord = await tx.branchProductStock.create({
            data: {
              branchId: saleReturn.branchId,
              productId: item.productId,
              stock: 0,
            },
          });
        }

        // 1. Reingresar mercancía sumando al stock de la sucursal atómicamente
        await tx.branchProductStock.update({
          where: { id: stockRecord.id },
          data: { stock: { increment: item.quantity } }, // CORREGIDO: Propiedad 'stock'
        });

        // 2. Traza reversa en la bitácora del Kardex (InventoryMovement)
        await tx.inventoryMovement.create({
          data: {
            organizationId: saleReturn.organizationId,
            branchId: saleReturn.branchId,
            productId: item.productId,
            movementType: 'CUSTOMER_RETURN', // CORREGIDO: Tipo oficial de tu enum InventoryMovementType
            quantity: item.quantity,
            reference: `DEV-${saleReturn.returnNumber}`,
            notes: item.notes || `Reingreso automático por devolución de cliente en POS.`,
          },
        });
      }

      // 3. Sellar el flujo definitivo a COMPLETED usando tu enum SaleReturnStatus
      return tx.saleReturn.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
    });
  }
}
