import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';

@Injectable()
export class TaxesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTaxDto: CreateTaxDto) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: createTaxDto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const existingTax = await this.prisma.taxRule.findFirst({
      where: {
        organizationId: createTaxDto.organizationId,
        code: createTaxDto.code,
        isActive: true,
      },
    });

    if (existingTax) {
      throw new ConflictException('A tax rule with this code already exists');
    }

    return this.prisma.taxRule.create({
      data: {
        organizationId: createTaxDto.organizationId,
        name: createTaxDto.name,
        code: createTaxDto.code,
        type: createTaxDto.type,
        percentage: createTaxDto.percentage,
        isRetention: createTaxDto.isRetention ?? false,
      },
    });
  }

  async findAll() {
    return this.prisma.taxRule.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.getTaxRuleOrThrow(id);
  }

  async update(id: string, updateTaxDto: UpdateTaxDto) {
    const taxRule = await this.getTaxRuleOrThrow(id);

    if (updateTaxDto.code && updateTaxDto.code !== taxRule.code) {
      const existingTax = await this.prisma.taxRule.findFirst({
        where: {
          organizationId: taxRule.organizationId,
          code: updateTaxDto.code,
          isActive: true,
        },
      });

      if (existingTax) {
        throw new ConflictException('A tax rule with this code already exists');
      }
    }

    return this.prisma.taxRule.update({
      where: { id },
      data: updateTaxDto,
    });
  }

  async remove(id: string) {
    await this.getTaxRuleOrThrow(id);

    return this.prisma.taxRule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async getTaxRuleOrThrow(id: string) {
    const taxRule = await this.prisma.taxRule.findFirst({
      where: { id, isActive: true },
    });

    if (!taxRule) {
      throw new NotFoundException('Tax rule not found');
    }

    return taxRule;
  }
}
