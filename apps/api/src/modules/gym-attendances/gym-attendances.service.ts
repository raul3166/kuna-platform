import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateGymAttendanceDto } from './dto/create-gym-attendance.dto';

@Injectable()
export class GymAttendancesService {
  constructor(private readonly prisma: PrismaService) {}

  async checkIn(dto: CreateGymAttendanceDto) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        organizationId: dto.organizationId,
        identificationNumber: dto.documentNumber,
      },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado con ese número de documento');
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const activeSubscription = await this.prisma.gymSubscription.findFirst({
      where: {
        customerId: customer.id,
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
      include: { plan: true },
    });

    let status = 'ALLOWED';
    let reason = 'Membresía activa y al día';

    if (!activeSubscription) {
      status = 'DENIED';
      reason = 'No cuenta con una membresía activa o se encuentra vencida/pendiente de pago';
    } else {
      // Validar si el plan es limitado (ej. 1 entrada al día) usando el campo accessType
      if (activeSubscription.plan.accessType === 'LIMITED_DAILY') {
        const existingCheckInToday = await this.prisma.gymAttendanceLog.findFirst({
          where: {
            customerId: customer.id,
            status: 'ALLOWED',
            checkInAt: {
              gte: todayStart,
              lte: todayEnd,
            },
          },
        });

        if (existingCheckInToday) {
          status = 'DENIED';
          reason = 'Acceso denegado: Este plan básico solo permite un ingreso por día';
        }
      }
    }

    // Registrar el intento de acceso
    const log = await this.prisma.gymAttendanceLog.create({
      data: {
        organizationId: dto.organizationId,
        branchId: dto.branchId,
        customerId: customer.id,
        status,
        reason,
      },
      include: {
        customer: true,
      },
    });

    let totalCheckIns = 0;
    if (activeSubscription) {
      totalCheckIns = await this.prisma.gymAttendanceLog.count({
        where: {
          customerId: customer.id,
          status: 'ALLOWED',
          checkInAt: {
            gte: activeSubscription.startDate,
            lte: activeSubscription.endDate,
          },
        },
      });
    }

    return {
      ...log,
      subscription: activeSubscription,
      plan: activeSubscription?.plan || null,
      totalCheckIns,
    };
  }

  async findAll(organizationId: string, branchId?: string) {
    return this.prisma.gymAttendanceLog.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        customer: true,
      },
      orderBy: { checkInAt: 'desc' },
      take: 100,
    });
  }
}
