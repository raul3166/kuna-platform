import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateStudioSubscriptionDto } from './dto/create-studio-subscription.dto';
import { StudioPlanType } from '../studio-plans/dto/create-studio-plan.dto';

@Injectable()
export class StudioSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudioSubscriptionDto) {
    if (!dto.branchId) {
    throw new BadRequestException('Se requiere una sucursal (branchId) para crear la suscripción');
  }

    const plan = await this.prisma.studioPlan.findUnique({
      where: { id: dto.studioPlanId },
    });

    if (!plan) {
      throw new NotFoundException('El plan de estudio no existe');
    }

    // Validación si el plan es exclusivo para alumnos nuevos
    if (plan.isNewStudentOnly) {
      const existingSubs = await this.prisma.studioSubscription.count({
        where: { customerId: dto.customerId },
      });
      if (existingSubs > 0) {
        throw new BadRequestException('Este plan solo está disponible para alumnos nuevos');
      }
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const isPack = plan.type === StudioPlanType.CLASS_PACK;

    return this.prisma.studioSubscription.create({
      data: {
        organizationId: dto.organizationId,
        branchId: dto.branchId,
        customerId: dto.customerId,
        studioPlanId: plan.id,
        startDate,
        endDate,
        totalClasses: isPack ? plan.totalClasses : null,
        remainingClasses: isPack ? plan.totalClasses : null,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
        customer: true,
      },
    });
  }

  async findAll(organizationId: string, branchId?: string, customerId?: string) {
    return this.prisma.studioSubscription.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
        ...(customerId ? { customerId } : {}),
      },
      include: {
        plan: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const sub = await this.prisma.studioSubscription.findUnique({
      where: { id },
      include: {
        plan: true,
        customer: true,
        attendanceLogs: {
          take: 10,
          orderBy: { checkInAt: 'desc' },
        },
      },
    });

    if (!sub) {
      throw new NotFoundException(`Suscripción con ID ${id} no encontrada`);
    }

    return sub;
  }

  async cancel(id: string) {
    await this.findOne(id);
    return this.prisma.studioSubscription.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
