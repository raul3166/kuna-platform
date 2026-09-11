import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateServiceItemDto } from './dto/create-service-item.dto';
import { UpdateServiceItemDto } from './dto/update-service-item.dto';

@Injectable()
export class ServiceItemsService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateServiceItemDto) {
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

    return this.prisma.serviceItem.create({
      data: createDto,
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.serviceItem.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const item = await this.prisma.serviceItem.findFirst({
      where: { id, organizationId },
    });

    if (!item) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }
    return item;
  }

  async update(id: string, organizationId: string, updateDto: UpdateServiceItemDto) {
    await this.findOne(id, organizationId);

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

    return this.prisma.serviceItem.update({
      where: { id },
      data: updateDto,
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    return this.prisma.serviceItem.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
