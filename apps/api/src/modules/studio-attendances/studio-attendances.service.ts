import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateStudioAttendanceDto } from './dto/create-studio-attendance.dto';

@Injectable()
export class StudioAttendancesService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(dto: CreateStudioAttendanceDto) {
    // 1. Buscar cliente por número de documento
    const customer = await this.prisma.customer.findFirst({
      where: {
        organizationId: dto.organizationId,
        identificationNumber: dto.documentNumber,
      },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado con ese número de documento');
    }

    // Determinar la fecha objetivo (si viene dto.date 'YYYY-MM-DD', o usa la hora actual)
    let baseDate = new Date();
    if (dto.date) {
      const [year, month, day] = dto.date.split('-').map(Number);
      baseDate = new Date(year, month - 1, day);
    }

    const dayStart = new Date(baseDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(baseDate);
    dayEnd.setHours(23, 59, 59, 999);

    // 2. Buscar suscripción activa y vigente para la fecha elegida
    const activeSubscription = await this.prisma.studioSubscription.findFirst({
      where: {
        customerId: customer.id,
        organizationId: dto.organizationId,
        status: 'ACTIVE',
        startDate: { lte: dayEnd },
        endDate: { gte: dayStart },
      },
      include: { plan: true },
    });

    let status = 'ALLOWED';
    let reason = 'Ingreso autorizado';

    if (!activeSubscription) {
      status = 'DENIED';
      reason = 'No cuenta con una suscripción activa o se encuentra vencida para esta fecha';
    } else {
      const plan = activeSubscription.plan;

      // Validar si es paquete de clases agotado
      if (plan.type === 'CLASS_PACK' && (activeSubscription.remainingClasses ?? 0) <= 0) {
        status = 'DENIED';
        reason = 'Acceso denegado: El paquete de clases asignado ya se encuentra agotado';
      } else {
        // Validar límite diario para la fecha seleccionada
        const maxAllowed = plan.maxDailyCheckIns ?? 2;
        const existingCheckInsToday = await this.prisma.studioAttendanceLog.count({
          where: {
            customerId: customer.id,
            status: 'ALLOWED',
            checkInAt: {
              gte: dayStart,
              lte: dayEnd,
            },
          },
        });

        if (existingCheckInsToday >= maxAllowed) {
          status = 'DENIED';
          reason = `Acceso denegado: Superó el límite de ${maxAllowed} ingresos permitidos para esta fecha`;
        }
      }
    }

    // 3. Transacción para registrar el log y actualizar saldos
    return this.prisma.$transaction(async (tx) => {
      let updatedRemaining = activeSubscription?.remainingClasses ?? null;

      if (status === 'ALLOWED' && activeSubscription) {
        const isPack = activeSubscription.plan.type === 'CLASS_PACK';

        if (isPack && activeSubscription.remainingClasses !== null) {
          updatedRemaining = activeSubscription.remainingClasses - 1;

          await tx.studioSubscription.update({
            where: { id: activeSubscription.id },
            data: {
              remainingClasses: updatedRemaining,
              status: updatedRemaining === 0 ? 'EXHAUSTED' : 'ACTIVE',
            },
          });
        }
      }

      // Si se especificó dto.date se asigna a la fecha seleccionada; si no, Prisma usará la fecha/hora actual
      const checkInTimestamp = dto.date ? dayStart : undefined;

      const log = await tx.studioAttendanceLog.create({
        data: {
          organizationId: dto.organizationId,
          branchId: dto.branchId,
          customerId: customer.id,
          studioSubscriptionId: activeSubscription?.id ?? null,
          studioScheduleId: dto.studioScheduleId ?? null,
          status,
          reason,
          ...(checkInTimestamp ? { checkInAt: checkInTimestamp } : {}),
        },
        include: {
          customer: true,
          schedule: true,
        },
      });

      return {
        ...log,
        subscription: activeSubscription,
        plan: activeSubscription?.plan || null,
        remainingClasses: updatedRemaining,
      };
    });
  }

  async findAll(
    organizationId: string,
    branchId?: string,
    studioScheduleId?: string,
    date?: string,
  ) {
    let dateFilter = {};

    if (date) {
      const [year, month, day] = date.split('-').map(Number);

      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

      dateFilter = {
        checkInAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    return this.prisma.studioAttendanceLog.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
        ...(studioScheduleId ? { studioScheduleId } : {}),
        ...dateFilter,
      },
      include: {
        customer: true,
        schedule: true,
        subscription: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: { checkInAt: 'desc' },
      take: 100,
    });
  }
}
