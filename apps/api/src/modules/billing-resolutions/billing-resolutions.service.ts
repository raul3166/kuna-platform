import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateBillingResolutionDto } from './dto/create-billing-resolution.dto';

@Injectable()
export class BillingResolutionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBillingResolutionDto) {
    const existing = await this.prisma.billingResolution.findUnique({
      where: { branchId: dto.branchId },
    });
    if (existing && existing.isActive) {
      throw new ConflictException('An active resolution already exists for this branch');
    }

    return this.prisma.billingResolution.create({
      data: {
        organizationId: dto.organizationId,
        branchId: dto.branchId,
        prefix: dto.prefix.toUpperCase(),
        resolutionNumber: dto.resolutionNumber,
        fromNumber: dto.fromNumber,
        toNumber: dto.toNumber,
        currentNumber: dto.currentNumber,
        expiryDate: new Date(dto.expiryDate),
      },
    });
  }

  async findAll() {
    return this.prisma.billingResolution.findMany({ include: { branch: true } });
  }

  async remove(id: string) {
    await this.prisma.billingResolution.delete({ where: { id } });
    return { message: 'Resolution removed' };
  }
}
