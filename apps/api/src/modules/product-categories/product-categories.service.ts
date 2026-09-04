import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

@Injectable()
export class ProductCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createProductCategoryDto: CreateProductCategoryDto,
  ) {
    await this.getOrganizationOrThrow(
      createProductCategoryDto.organizationId,
    );

    const existing =
      await this.prisma.productCategory.findFirst({
        where: {
          organizationId:
            createProductCategoryDto.organizationId,

          name: createProductCategoryDto.name,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Category already exists',
      );
    }

    return this.prisma.productCategory.create({
      data: createProductCategoryDto,
    });
  }

  async findAll(organizationId?: string) {
  return this.prisma.productCategory.findMany({
    where: {
      isActive: true,
      ...(organizationId && { organizationId }),
    },
    orderBy: {
      name: 'asc',
    },
  });
}

  async findOne(id: string) {
    return this.getCategoryOrThrow(id);
  }

  async update(
    id: string,
    updateDto: UpdateProductCategoryDto,
  ) {
    const current =
      await this.getCategoryOrThrow(id);

    if (
      updateDto.name &&
      updateDto.name !== current.name
    ) {
      const existing =
        await this.prisma.productCategory.findFirst({
          where: {
            organizationId:
              current.organizationId,

            name: updateDto.name,

            NOT: {
              id,
            },
          },
        });

      if (existing) {
        throw new ConflictException(
          'Category already exists',
        );
      }
    }

    return this.prisma.productCategory.update({
      where: {
        id,
      },

      data: updateDto,
    });
  }

  async remove(id: string) {
    await this.getCategoryOrThrow(id);

    return this.prisma.productCategory.update({
      where: {
        id,
      },

      data: {
        isActive: false,
      },
    });
  }

  private async getCategoryOrThrow(id: string) {
    const category =
      await this.prisma.productCategory.findUnique({
        where: {
          id,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Category not found',
      );
    }

    return category;
  }

  private async getOrganizationOrThrow(id: string) {
    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found',
      );
    }

    return organization;
  }
}
