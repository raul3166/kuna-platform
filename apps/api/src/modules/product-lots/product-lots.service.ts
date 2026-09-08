import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateProductLotDto } from './dto/create-product-lot.dto';

@Injectable()
export class ProductLotsService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrIncrement(dto: CreateProductLotDto) {
    return this.prisma.productLot.upsert({
      where: {
        productId_branchId_lotNumber: {
          productId: dto.productId,
          branchId: dto.branchId,
          lotNumber: dto.lotNumber,
        },
      },
      update: {
        stock: { increment: dto.stock },
        expirationDate: new Date(dto.expirationDate),
      },
      create: {
        productId: dto.productId,
        branchId: dto.branchId,
        lotNumber: dto.lotNumber,
        expirationDate: new Date(dto.expirationDate),
        stock: dto.stock,
      },
    });
  }

  // Ordenamiento FEFO (First Expired, First Out)
  async getLotsFEFO(productId: string, branchId: string) {
    return this.prisma.productLot.findMany({
      where: {
        productId,
        branchId,
        stock: { gt: 0 },
        expirationDate: { gte: new Date() },
      },
      orderBy: {
        expirationDate: 'asc',
      },
    });
  }

  // Alerta de lotes próximos a vencer
  async getExpiringLots(branchId: string, daysThreshold = 60) {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + daysThreshold);

    return this.prisma.productLot.findMany({
      where: {
        branchId,
        stock: { gt: 0 },
        expirationDate: {
          lte: limitDate,
        },
      },
      include: {
        product: {
          include: {
            pharmaDetail: true,
          },
        },
      },
      orderBy: {
        expirationDate: 'asc',
      },
    });
  }
}
