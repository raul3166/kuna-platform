import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateServiceOrderMaterialDto } from './dto/create-service-order-material.dto';
import { ServiceOrderStatus } from '@prisma/client';

@Injectable()
export class ServiceOrderMaterialsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateServiceOrderMaterialDto) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: dto.serviceOrderId },
    });

    if (!order) {
      throw new NotFoundException(`Orden de servicio con ID ${dto.serviceOrderId} no encontrada`);
    }

    if (order.status === ServiceOrderStatus.COMPLETED || order.status === ServiceOrderStatus.BILLED) {
      throw new ConflictException('No se pueden modificar órdenes completadas o facturadas.');
    }

    const total = Number(dto.quantity) * Number(dto.unitPrice);

    const material = await this.prisma.serviceOrderMaterial.create({
      data: {
        serviceOrderId: dto.serviceOrderId,
        productId: dto.productId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        unitCost: dto.unitCost,
        total,
      },
    });

    await this.recalculateTotals(dto.serviceOrderId);
    return material;
  }

  async remove(id: string) {
    const material = await this.prisma.serviceOrderMaterial.findUnique({
      where: { id },
      include: { serviceOrder: true },
    });

    if (!material) {
      throw new NotFoundException(`Material con ID ${id} no encontrado`);
    }

    if (
      material.serviceOrder.status === ServiceOrderStatus.COMPLETED ||
      material.serviceOrder.status === ServiceOrderStatus.BILLED
    ) {
      throw new ConflictException('No se pueden modificar órdenes completadas o facturadas.');
    }

    await this.prisma.serviceOrderMaterial.delete({
      where: { id },
    });

    await this.recalculateTotals(material.serviceOrderId);
    return { message: 'Material eliminado exitosamente' };
  }

  private async recalculateTotals(orderId: string) {
    const tasks = await this.prisma.serviceOrderTask.findMany({
      where: { serviceOrderId: orderId },
    });

    const materials = await this.prisma.serviceOrderMaterial.findMany({
      where: { serviceOrderId: orderId },
    });

    const laborTotal = tasks.reduce((acc, t) => acc + Number(t.price), 0);
    const materialsTotal = materials.reduce((acc, m) => acc + Number(m.total), 0);
    const total = laborTotal + materialsTotal;

    await this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: {
        laborTotal,
        materialsTotal,
        total,
      },
    });
  }
}
