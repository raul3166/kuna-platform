import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateStudioAttendanceDto } from './dto/create-studio-attendance.dto';

@Injectable()
export class StudioAttendancesService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(dto: CreateStudioAttendanceDto) {
    // 1. Buscar cliente por ID directo o por número de documento
    const customer = dto.customerId
      ? await this.prisma.customer.findFirst({
          where: {
            id: dto.customerId,
            organizationId: dto.organizationId,
          },
        })
      : await this.prisma.customer.findFirst({
          where: {
            organizationId: dto.organizationId,
            identificationNumber: dto.documentNumber,
          },
        });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado con ese número de documento o registro');
    }

    let resolvedBranchId = dto.branchId;
    if (!resolvedBranchId) {
      if (dto.studioScheduleId) {
        const sched = await this.prisma.studioSchedule.findUnique({
          where: { id: dto.studioScheduleId },
          select: { branchId: true },
        });
        if (sched?.branchId) resolvedBranchId = sched.branchId;
      }
      if (!resolvedBranchId) {
        const firstBranch = await this.prisma.branch.findFirst({
          where: { organizationId: dto.organizationId, isActive: true },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        resolvedBranchId = firstBranch?.id || '';
      }
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

    // Verificar si ya se le tomó asistencia en esta misma clase y fecha
    if (dto.studioScheduleId) {
      const alreadyCheckedInSameClass = await this.prisma.studioAttendanceLog.findFirst({
        where: {
          organizationId: dto.organizationId,
          customerId: customer.id,
          studioScheduleId: dto.studioScheduleId,
          status: 'ALLOWED',
          checkInAt: { gte: dayStart, lte: dayEnd },
        },
        include: {
          customer: true,
          schedule: true,
          subscription: { include: { plan: true } },
        },
      });
      if (alreadyCheckedInSameClass) {
        return {
          ...alreadyCheckedInSameClass,
          plan: alreadyCheckedInSameClass.subscription?.plan || null,
          remainingClasses: alreadyCheckedInSameClass.subscription?.remainingClasses ?? null,
          alreadyRegistered: true,
        };
      }
    }

    // 2. Buscar suscripción activa (vigente en fechas O pendiente de asistir a su 1ª clase)
    const activeSubscription = await this.prisma.studioSubscription.findFirst({
      where: {
        customerId: customer.id,
        organizationId: dto.organizationId,
        status: 'ACTIVE',
        OR: [
          {
            startDate: { lte: dayEnd },
            endDate: { gte: dayStart },
          },
          {
            attendanceLogs: {
              none: { status: 'ALLOWED' },
            },
          },
        ],
      },
      include: {
        plan: true,
        _count: {
          select: {
            attendanceLogs: {
              where: { status: 'ALLOWED' },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
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

    // 3. Transacción para registrar el log, activar vigencia desde la 1ª clase y actualizar saldos
    return this.prisma.$transaction(async (tx) => {
      let updatedRemaining = activeSubscription?.remainingClasses ?? null;

      if (status === 'ALLOWED' && activeSubscription) {
        const isPack = activeSubscription.plan.type === 'CLASS_PACK';
        const isFirstClassAttended = (activeSubscription._count?.attendanceLogs ?? 0) === 0;

        const updateData: Record<string, any> = {};

        // Si es la primera clase a la que asiste con este paquete, la vigencia empieza a correr hoy
        if (isFirstClassAttended) {
          const firstClassStart = new Date(dayStart);
          const calculatedEnd = new Date(dayStart);
          calculatedEnd.setDate(calculatedEnd.getDate() + (activeSubscription.plan.durationDays || 30));
          updateData.startDate = firstClassStart;
          updateData.endDate = calculatedEnd;
        }

        if (isPack && activeSubscription.remainingClasses !== null) {
          updatedRemaining = activeSubscription.remainingClasses - 1;
          updateData.remainingClasses = updatedRemaining;
          updateData.status = updatedRemaining === 0 ? 'EXHAUSTED' : 'ACTIVE';
        }

        if (Object.keys(updateData).length > 0) {
          await tx.studioSubscription.update({
            where: { id: activeSubscription.id },
            data: updateData,
          });
        }
      }

      // Si se especificó dto.date se asigna a la fecha seleccionada; si no, Prisma usará la fecha/hora actual
      const checkInTimestamp = dto.date ? dayStart : undefined;

      const log = await tx.studioAttendanceLog.create({
        data: {
          organizationId: dto.organizationId,
          branchId: resolvedBranchId,
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
