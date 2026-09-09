import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateStudioPlanDto } from './dto/create-studio-plan.dto';
import { UpdateStudioPlanDto } from './dto/update-studio-plan.dto';

@Injectable()
export class StudioPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudioPlanDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Buscar o crear la categoría "Clases de Estudio" sin control de inventario
      let category = await tx.productCategory.findFirst({
        where: {
          organizationId: dto.organizationId,
          name: 'Clases de Estudio',
        },
      });

      if (!category) {
        category = await tx.productCategory.create({
          data: {
            organizationId: dto.organizationId,
            name: 'Clases de Estudio',
            description: 'Categoría para paquetes y tiqueteras de Yoga, Pilates y Barre',
            trackStock: false,
          },
        });
      }

      // 2. Crear el producto equivalente en el POS
      const product = await tx.product.create({
        data: {
          organizationId: dto.organizationId,
          categoryId: category.id,
          sku: `STUDIO-${Date.now()}`,
          name: dto.name,
          description: dto.description,
          salePrice: dto.price,
          costPrice: 0,
          stock: 0,
        },
      });

      // 3. Crear el plan de estudio
      return tx.studioPlan.create({
        data: {
          organizationId: dto.organizationId,
          branchId: dto.branchId,
          name: dto.name,
          description: dto.description,
          price: dto.price,
          durationDays: dto.durationDays,
          type: dto.type,
          totalClasses: dto.totalClasses ?? null,
          maxDailyCheckIns: dto.maxDailyCheckIns ?? 2,
          isNewStudentOnly: dto.isNewStudentOnly ?? false,
          badge: dto.badge,
          productId: product.id,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });
    });
  }

  async findAll(organizationId: string, branchId?: string) {
    return this.prisma.studioPlan.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        product: true,
      },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.studioPlan.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!plan) {
      throw new NotFoundException(`Studio plan with ID ${id} not found`);
    }

    return plan;
  }

  async update(id: string, dto: UpdateStudioPlanDto) {
    const plan = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      if (plan.productId) {
        await tx.product.update({
          where: { id: plan.productId },
          data: {
            ...(dto.name && { name: dto.name }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.price !== undefined && { salePrice: dto.price }),
          },
        });
      }

      return tx.studioPlan.update({
        where: { id },
        data: dto,
        include: { product: true },
      });
    });
  }

  async remove(id: string) {
    const plan = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const deletedPlan = await tx.studioPlan.delete({
        where: { id },
      });

      if (plan.productId) {
        await tx.product.update({
          where: { id: plan.productId },
          data: { isActive: false },
        });
      }

      return deletedPlan;
    });
  }
}
