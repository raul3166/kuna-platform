import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createSupplierDto: CreateSupplierDto,
  ) {
    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id: createSupplierDto.organizationId,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found',
      );
    }

    const existingSupplier =
  await this.prisma.supplier.findFirst({
    where: {
      organizationId:
        createSupplierDto.organizationId,
      identificationNumber:
        createSupplierDto.identificationNumber,
      isActive: true,
    },
  });

if (existingSupplier) {
  throw new ConflictException(
    'Supplier already exists',
  );
}

    return this.prisma.supplier.create({
      data: createSupplierDto,
    });
  }

  async findAll() {
    return this.prisma.supplier.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
          companyName: 'asc',
      },
    });
  }

  async findOne(id: string) {
    return this.getSupplierOrThrow(id);
  }

  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ) {
    await this.getSupplierOrThrow(id);

    return this.prisma.supplier.update({
      where: {
        id,
      },
      data: updateSupplierDto,
    });
  }

  async remove(id: string) {
    await this.getSupplierOrThrow(id);

    return this.prisma.supplier.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  }

  private async getSupplierOrThrow(
    id: string,
  ) {
    const supplier =
      await this.prisma.supplier.findFirst({
        where: {
          id,
          isActive: true,
        },
      });

    if (!supplier) {
      throw new NotFoundException(
        'Supplier not found',
      );
    }

    return supplier;
  }
}
