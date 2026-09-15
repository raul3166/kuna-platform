import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateServiceOrderTaskDto } from './dto/create-service-order-task.dto';
import { ServiceOrderStatus } from '@prisma/client';

@Injectable()
export class ServiceOrderTasksService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateServiceOrderTaskDto) {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id: dto.serviceOrderId },
    });

    if (!order) {
      throw new NotFoundException(`Orden de servicio con ID ${dto.serviceOrderId} no encontrada`);
    }

    if (order.status === ServiceOrderStatus.COMPLETED || order.status === ServiceOrderStatus.BILLED) {
      throw new ConflictException('No se pueden modificar órdenes completadas o facturadas.');
    }

    const task = await this.prisma.serviceOrderTask.create({
      data: {
        serviceOrderId: dto.serviceOrderId,
        serviceItemId: dto.serviceItemId,
        description: dto.description,
        assignedWorkerId: dto.assignedWorkerId,
        price: dto.price,
      },
    });

    await this.recalculateTotals(dto.serviceOrderId);
    return task;
  }

  async remove(id: string) {
    const task = await this.prisma.serviceOrderTask.findUnique({
      where: { id },
      include: { serviceOrder: true },
    });

    if (!task) {
      throw new NotFoundException(`Tarea con ID ${id} no encontrada`);
    }

    if (
      task.serviceOrder.status === ServiceOrderStatus.COMPLETED ||
      task.serviceOrder.status === ServiceOrderStatus.BILLED
    ) {
      throw new ConflictException('No se pueden modificar órdenes completadas o facturadas.');
    }

    await this.prisma.serviceOrderTask.delete({
      where: { id },
    });

    await this.recalculateTotals(task.serviceOrderId);
    return { message: 'Tarea eliminada exitosamente' };
  }

  private async recalculateTotals(orderId: string) {
  const order = await this.prisma.serviceOrder.findUnique({
    where: { id: orderId },
    include: { serviceItem: true },
  });

  if (!order) return;

  const tasks = await this.prisma.serviceOrderTask.findMany({
    where: { serviceOrderId: orderId },
  });

  const materials = await this.prisma.serviceOrderMaterial.findMany({
    where: { serviceOrderId: orderId },
  });

  // Conservar precio base del servicio asignado
  const serviceBasePrice = Number(order.serviceItem?.basePrice || 0);
  const tasksTotal = tasks.reduce((acc, t) => acc + Number(t.price), 0);

  const laborTotal = serviceBasePrice + tasksTotal;
  const materialsTotal = materials.reduce((acc, m) => acc + Number(m.total), 0);
  const total = laborTotal + materialsTotal;

  await this.prisma.serviceOrder.update({
    where: { id: orderId },
    data: { laborTotal, materialsTotal, total },
  });
}
}
