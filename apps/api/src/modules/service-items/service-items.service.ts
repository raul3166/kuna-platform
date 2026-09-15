import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateServiceItemDto } from './dto/create-service-item.dto';
import { UpdateServiceItemDto } from './dto/update-service-item.dto';

@Injectable()
export class ServiceItemsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateServiceItemDto & { organizationId: string }) {
    const existingItem = await this.prisma.serviceItem.findUnique({
      where: {
        organizationId_name: {
          organizationId: createDto.organizationId,
          name: createDto.name,
        },
      },
    });

    if (existingItem) {
      throw new ConflictException('Ya existe un servicio con este nombre en la organización.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Buscar o crear la categoría "Servicios de Taller" sin control de inventario
      let category = await tx.productCategory.findFirst({
        where: {
          organizationId: createDto.organizationId,
          name: 'Servicios de Taller',
        },
      });

      if (!category) {
        category = await tx.productCategory.create({
          data: {
            organizationId: createDto.organizationId,
            name: 'Servicios de Taller',
            description: 'Categoría para servicios de mantenimiento y mano de obra',
            trackStock: false,
          },
        });
      }

      // 2. Crear el producto equivalente en el POS (sin control de inventario)
      const product = await tx.product.create({
        data: {
          organizationId: createDto.organizationId,
          categoryId: category.id,
          sku: `SERV-${Date.now()}`,
          name: createDto.name,
          description: createDto.description,
          salePrice: createDto.basePrice, // O el campo de precio que maneje tu DTO
          costPrice: 0,
          stock: 0,
          isActive: true,
        },
      });

      // 3. Crear el ítem de servicio asociado al producto del POS
      return tx.serviceItem.create({
        data: {
          ...createDto,
          productId: product.id, // Asegúrate de incluir este campo en tu esquema Prisma si deseas la relación directa
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

  async findAll(organizationId: string) {
    return this.prisma.serviceItem.findMany({
      where: { organizationId, isActive: true },
      include: { product: true },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const item = await this.prisma.serviceItem.findFirst({
      where: { id, organizationId },
      include: { product: true },
    });

    if (!item) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }
    return item;
  }

  async update(id: string, organizationId: string, updateDto: UpdateServiceItemDto) {
    const serviceItem = await this.findOne(id, organizationId);

    if (updateDto.name) {
      const existingItem = await this.prisma.serviceItem.findFirst({
        where: {
          organizationId,
          name: updateDto.name,
          NOT: { id },
        },
      });

      if (existingItem) {
        throw new ConflictException('El nombre ya está en uso por otro servicio.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (serviceItem.productId) {
        await tx.product.update({
          where: { id: serviceItem.productId },
          data: {
            ...(updateDto.name && { name: updateDto.name }),
            ...(updateDto.description !== undefined && { description: updateDto.description }),
            ...((updateDto as any).basePrice !== undefined && { salePrice: (updateDto as any).basePrice }),
          },
        });
      }

      return tx.serviceItem.update({
        where: { id },
        data: updateDto,
        include: { product: true },
      });
    });
  }

  async remove(id: string, organizationId: string) {
    const serviceItem = await this.findOne(id, organizationId);

    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.serviceItem.update({
        where: { id },
        data: { isActive: false },
      });

      if (serviceItem.productId) {
        await tx.product.update({
          where: { id: serviceItem.productId },
          data: { isActive: false },
        });
      }

      return deleted;
    });
  }
}
