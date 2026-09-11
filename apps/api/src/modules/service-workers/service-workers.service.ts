import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateServiceWorkerDto } from './dto/create-service-worker.dto';
import { UpdateServiceWorkerDto } from './dto/update-service-worker.dto';

@Injectable()
export class ServiceWorkersService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateServiceWorkerDto) {
    const existingWorker = await this.prisma.serviceWorker.findUnique({
      where: {
        organizationId_identification: {
          organizationId: createDto.organizationId,
          identification: createDto.identification,
        },
      },
    });

    if (existingWorker) {
      throw new ConflictException('Ya existe un trabajador con esta identificación en la organización.');
    }

    return this.prisma.serviceWorker.create({
      data: createDto,
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.serviceWorker.findMany({
      where: { organizationId },
      include: {
        branch: {
          select: { id: true, name: true }
        }
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const worker = await this.prisma.serviceWorker.findFirst({
      where: { id, organizationId },
      include: { branch: true },
    });

    if (!worker) {
      throw new NotFoundException(`Trabajador con ID ${id} no encontrado`);
    }
    return worker;
  }

  async update(id: string, organizationId: string, updateDto: UpdateServiceWorkerDto) {
    await this.findOne(id, organizationId); // Validar existencia

    if (updateDto.identification) {
      const existingWorker = await this.prisma.serviceWorker.findFirst({
        where: {
          organizationId,
          identification: updateDto.identification,
          NOT: { id },
        },
      });

      if (existingWorker) {
        throw new ConflictException('La identificación ya está en uso por otro trabajador.');
      }
    }

    return this.prisma.serviceWorker.update({
      where: { id },
      data: updateDto,
    });
  }

  // Se recomienda Soft Delete (isActive: false) para no perder el historial de órdenes
  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    return this.prisma.serviceWorker.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getWorkerCommissions(
    id: string,
    organizationId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const worker = await this.findOne(id, organizationId);

    // Construir filtro de fechas opcional
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      // Ajustar la hora al final del día para incluir todas las órdenes de esa fecha
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // Obtener tareas asignadas al trabajador en órdenes completadas o facturadas
    const tasks = await this.prisma.serviceOrderTask.findMany({
      where: {
        assignedWorkerId: id,
        serviceOrder: {
          organizationId,
          status: { in: ['COMPLETED', 'BILLED'] },
          ...(startDate || endDate ? { createdAt: dateFilter } : {}),
        },
      },
      include: {
        serviceOrder: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        serviceOrder: {
          createdAt: 'desc',
        },
      },
    });

    const totalLaborGenerated = tasks.reduce((acc, task) => acc + Number(task.price), 0);
    const commissionPercentage = Number(worker.commissionPercentage);
    const estimatedCommission = (totalLaborGenerated * commissionPercentage) / 100;
    const fixedSalary = Number(worker.fixedSalary);

    return {
      worker: {
        id: worker.id,
        name: `${worker.firstName} ${worker.lastName || ''}`.trim(),
        specialty: worker.specialty,
        commissionPercentage,
        fixedSalary,
      },
      filterApplied: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      metrics: {
        completedTasksCount: tasks.length,
        totalLaborGenerated,
        estimatedCommission,
        totalEarnings: fixedSalary + estimatedCommission,
      },
      tasks,
    };
  }
}
