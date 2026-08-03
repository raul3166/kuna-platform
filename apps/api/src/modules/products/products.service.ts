import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { productSelect } from '../../common/prisma/selects';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(createProductDto: CreateProductDto) {
    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id: createProductDto.organizationId,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found',
      );
    }

    const existingProduct =
      await this.prisma.product.findFirst({
        where: {
          organizationId:
            createProductDto.organizationId,
          sku: createProductDto.sku,
          isActive: true,
        },
      });

    if (existingProduct) {
      throw new ConflictException(
        'A product with this SKU already exists',
      );
    }

    return this.prisma.product.create({
      data: createProductDto,
      select: productSelect,
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
      select: productSelect,
    });
  }

  async findOne(id: string) {
    return this.getProductOrThrow(id);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ) {
    const product =
      await this.getProductOrThrow(id);

    if (
      updateProductDto.sku &&
      updateProductDto.sku !== product.sku
    ) {
      const existingProduct =
        await this.prisma.product.findFirst({
          where: {
            organizationId:
              product.organizationId,
            sku: updateProductDto.sku,
            isActive: true,
          },
        });

      if (existingProduct) {
        throw new ConflictException(
          'A product with this SKU already exists',
        );
      }
    }

    return this.prisma.product.update({
      where: {
        id,
      },
      data: updateProductDto,
      select: productSelect,
    });
  }

  async remove(id: string) {
    await this.getProductOrThrow(id);

    return this.prisma.product.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
      select: productSelect,
    });
  }

  private async getProductOrThrow(
    id: string,
  ) {
    const product =
      await this.prisma.product.findFirst({
        where: {
          id,
          isActive: true,
        },
        select: productSelect,
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    return product;
  }
}
