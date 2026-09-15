import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { EmploymentType } from '@prisma/client';
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

    // Forzar porcentaje de comisión a 0 si el tipo de vinculación es SALARIED
    const data = {
      ...createDto,
      commissionPercentage:
        createDto.employmentType === EmploymentType.SALARIED
          ? 0
          : (createDto.commissionPercentage ?? 0),
    };

    return this.prisma.serviceWorker.create({ data });
  }

  async findAll(organizationId: string) {
    return this.prisma.serviceWorker.findMany({
      where: { organizationId },
      include: {
        branch: {
          select: { id: true, name: true },
        },
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
    const currentWorker = await this.findOne(id, organizationId);

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

    const effectiveEmploymentType = updateDto.employmentType ?? currentWorker.employmentType;

    // Si cambia o se mantiene como SALARIED, forzar comisión a 0
    const dataToUpdate = {
      ...updateDto,
      commissionPercentage:
        effectiveEmploymentType === EmploymentType.SALARIED
          ? 0
          : (updateDto.commissionPercentage ?? currentWorker.commissionPercentage),
    };

    return this.prisma.serviceWorker.update({
      where: { id },
      data: dataToUpdate,
    });
  }

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

    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

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
    const isSalaried = worker.employmentType === EmploymentType.SALARIED;

    const commissionPercentage = isSalaried ? 0 : Number(worker.commissionPercentage);
    const estimatedCommission = isSalaried ? 0 : (totalLaborGenerated * commissionPercentage) / 100;
    const fixedSalary = Number(worker.fixedSalary);

    return {
      worker: {
        id: worker.id,
        name: `${worker.firstName} ${worker.lastName || ''}`.trim(),
        specialty: worker.specialty,
        employmentType: worker.employmentType,
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

  async getAllWorkersCommissions(
    organizationId: string,
    startDate?: string,
    endDate?: string,
    workerId?: string,
    employmentType?: string, // <--- Cambia a string para permitir 'ALL'
  ) {
    const workers = await this.prisma.serviceWorker.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(workerId && workerId !== 'ALL' ? { id: workerId } : {}),
        ...(employmentType && employmentType !== 'ALL'
          ? { employmentType: employmentType as EmploymentType }
          : {}),
      },
      orderBy: { firstName: 'asc' },
    });

    // Construir filtro de fechas para las órdenes
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // 2. Calcular los totales por cada trabajador leyendo directamente ServiceOrder
    const reports = await Promise.all(
      workers.map(async (worker) => {
        const orders = await this.prisma.serviceOrder.findMany({
          where: {
            organizationId,
            assignedWorkerId: worker.id,
            status: { in: ['COMPLETED', 'BILLED'] },
            ...(startDate || endDate ? { createdAt: dateFilter } : {}),
          },
          select: {
            id: true,
            laborTotal: true,
          },
        });

        const completedOrdersCount = orders.length;
        const totalLaborAmount = orders.reduce(
          (acc, order) => acc + Number(order.laborTotal || 0),
          0,
        );

        const isSalaried = worker.employmentType === EmploymentType.SALARIED;
        const commissionPercentage = isSalaried ? 0 : Number(worker.commissionPercentage || 0);
        const totalCommissionAmount = isSalaried
          ? 0
          : (totalLaborAmount * commissionPercentage) / 100;

        return {
          workerId: worker.id,
          workerName: `${worker.firstName} ${worker.lastName || ''}`.trim(),
          workerIdentification: worker.identification,
          employmentType: worker.employmentType,
          completedOrdersCount,
          totalLaborAmount,
          commissionPercentage,
          totalCommissionAmount,
        };
      }),
    );

    return reports;
  }
}
