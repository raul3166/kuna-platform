import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateStudioBookingDto } from './dto/create-studio-booking.dto';
import { BookingStatus } from '@prisma/client';

export interface FindAllBookingsParams {
  organizationId: string;
  branchId?: string;
  studioScheduleId?: string;
  customerId?: string;
  bookingDate?: string;
  status?: BookingStatus;
}

@Injectable()
export class StudioBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseLocalDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  async create(dto: CreateStudioBookingDto) {
    if (!dto.organizationId || !dto.branchId) {
      throw new BadRequestException('organizationId y branchId son requeridos');
    }

    const bookingDate = this.parseLocalDate(dto.bookingDate);

    // 1. Obtener el horario y validar aforo máximo
    const schedule = await this.prisma.studioSchedule.findFirst({
      where: { id: dto.studioScheduleId, organizationId: dto.organizationId },
    });

    if (!schedule) {
      throw new NotFoundException('El horario seleccionado no existe');
    }

    const confirmedCount = await this.prisma.studioBooking.count({
      where: {
        studioScheduleId: dto.studioScheduleId,
        bookingDate,
        status: BookingStatus.CONFIRMED,
      },
    });

    if (confirmedCount >= schedule.capacity) {
      throw new BadRequestException('La clase ya alcanzó el cupo máximo permitido');
    }

    // 2. Verificar duplicados (Si ya tiene reserva para este horario y fecha)
    const existingBooking = await this.prisma.studioBooking.findUnique({
      where: {
        studioScheduleId_customerId_bookingDate: {
          studioScheduleId: dto.studioScheduleId,
          customerId: dto.customerId,
          bookingDate,
        },
      },
    });

    if (existingBooking && existingBooking.status === BookingStatus.CONFIRMED) {
      throw new ConflictException('El cliente ya tiene una reserva confirmada para esta clase');
    }

    // 3. Verificar que el alumno tenga suscripción/paquete vigente (sin descontar créditos)
    const activeSubscription = await this.prisma.studioSubscription.findFirst({
      where: {
        customerId: dto.customerId,
        organizationId: dto.organizationId,
        status: 'ACTIVE',
        OR: [
          { remainingClasses: { gt: 0 } },
          { remainingClasses: null }, // Planes ilimitados
        ],
      },
    });

    if (!activeSubscription) {
      throw new BadRequestException('El cliente no cuenta con una membresía o paquete de clases activo');
    }

    // 4. Crear o reactivar reserva
    if (existingBooking) {
      return this.prisma.studioBooking.update({
        where: { id: existingBooking.id },
        data: { status: BookingStatus.CONFIRMED },
        include: { customer: true, schedule: { include: { instructor: true } } },
      });
    }

    return this.prisma.studioBooking.create({
      data: {
        organizationId: dto.organizationId,
        branchId: dto.branchId,
        customerId: dto.customerId,
        studioScheduleId: dto.studioScheduleId,
        bookingDate,
        status: dto.status || BookingStatus.CONFIRMED,
      },
      include: {
        customer: true,
        schedule: { include: { instructor: true } },
      },
    });
  }

  async findAll(params: FindAllBookingsParams) {
    let dateFilter = {};
    if (params.bookingDate) {
      const bookingDate = this.parseLocalDate(params.bookingDate);
      dateFilter = { bookingDate };
    }

    return this.prisma.studioBooking.findMany({
      where: {
        organizationId: params.organizationId,
        ...(params.branchId ? { branchId: params.branchId } : {}),
        ...(params.studioScheduleId ? { studioScheduleId: params.studioScheduleId } : {}),
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...dateFilter,
      },
      include: {
        customer: true,
        schedule: { include: { instructor: true } },
      },
      orderBy: { bookingDate: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const booking = await this.prisma.studioBooking.findFirst({
      where: { id, organizationId },
      include: { customer: true, schedule: { include: { instructor: true } } },
    });

    if (!booking) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return booking;
  }

  async cancel(id: string, organizationId: string) {
    await this.findOne(id, organizationId);

    return this.prisma.studioBooking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
  }

  async getAvailability(organizationId: string, studioScheduleId: string, bookingDateStr: string) {
    const schedule = await this.prisma.studioSchedule.findFirst({
      where: { id: studioScheduleId, organizationId },
    });

    if (!schedule) {
      throw new NotFoundException('Horario no encontrado');
    }

    const bookingDate = this.parseLocalDate(bookingDateStr);

    const reservedCount = await this.prisma.studioBooking.count({
      where: {
        studioScheduleId,
        bookingDate,
        status: BookingStatus.CONFIRMED,
      },
    });

    return {
      capacity: schedule.capacity,
      reserved: reservedCount,
      available: Math.max(0, schedule.capacity - reservedCount),
    };
  }

  private async resolveOrganizationBySlugOrId(slugOrId: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        isActive: true,
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
    });

    if (!org) {
      throw new NotFoundException('Estudio u organización no encontrada');
    }

    return org;
  }

  async getPublicCatalog(slugOrId: string, dateStr?: string) {
    const org = await this.resolveOrganizationBySlugOrId(slugOrId);
    const targetDateStr = dateStr || new Date().toISOString().split('T')[0];
    const targetDate = this.parseLocalDate(targetDateStr);

    const [branches, plans, schedules, bookingsForDate] = await Promise.all([
      this.prisma.branch.findMany({
        where: { organizationId: org.id, isActive: true },
        select: { id: true, name: true, address: true, city: true, phoneNumber: true },
      }),
      this.prisma.studioPlan.findMany({
        where: { organizationId: org.id, isActive: true },
        include: { product: { select: { id: true, name: true, salePrice: true } } },
        orderBy: { price: 'asc' },
      }),
      this.prisma.studioSchedule.findMany({
        where: { organizationId: org.id },
        include: {
          instructor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
          branch: { select: { id: true, name: true } },
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.studioBooking.findMany({
        where: {
          organizationId: org.id,
          bookingDate: targetDate,
          status: BookingStatus.CONFIRMED,
        },
        select: { studioScheduleId: true },
      }),
    ]);

    const reservedBySchedule: Record<string, number> = {};
    for (const b of bookingsForDate) {
      reservedBySchedule[b.studioScheduleId] = (reservedBySchedule[b.studioScheduleId] || 0) + 1;
    }

    const enrichedSchedules = schedules.map((s) => {
      const reserved = reservedBySchedule[s.id] || 0;
      return {
        ...s,
        reservedCount: reserved,
        availableSpots: Math.max(0, s.capacity - reserved),
      };
    });

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        country: org.country,
        timezone: org.timezone,
      },
      branches,
      plans,
      schedules: enrichedSchedules,
      selectedDate: targetDateStr,
    };
  }

  async getPublicStudentStatus(slugOrId: string, identifier: string) {
    const cleanId = (identifier || '').trim();
    if (!cleanId) {
      throw new BadRequestException('Ingresa tu número de documento o correo electrónico');
    }

    const org = await this.resolveOrganizationBySlugOrId(slugOrId);

    const customer = await this.prisma.customer.findFirst({
      where: {
        organizationId: org.id,
        isActive: true,
        OR: [
          { identificationNumber: { equals: cleanId, mode: 'insensitive' } },
          { email: { equals: cleanId, mode: 'insensitive' } },
          { phoneNumber: { equals: cleanId } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        identificationNumber: true,
        email: true,
        phoneNumber: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(
        'No encontramos un alumno registrado con ese documento o correo en este estudio.',
      );
    }

    const [subscriptions, bookings] = await Promise.all([
      this.prisma.studioSubscription.findMany({
        where: {
          organizationId: org.id,
          customerId: customer.id,
        },
        include: {
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.studioBooking.findMany({
        where: {
          organizationId: org.id,
          customerId: customer.id,
        },
        include: {
          schedule: {
            include: {
              instructor: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { bookingDate: 'desc' },
      }),
    ]);

    return {
      customer,
      subscriptions,
      bookings,
    };
  }

  async createPublicBooking(
    slugOrId: string,
    payload: { customerId: string; studioScheduleId: string; bookingDate: string },
  ) {
    const org = await this.resolveOrganizationBySlugOrId(slugOrId);

    const schedule = await this.prisma.studioSchedule.findFirst({
      where: { id: payload.studioScheduleId, organizationId: org.id },
    });

    if (!schedule) {
      throw new NotFoundException('El horario seleccionado no pertenece a este estudio');
    }

    let branchId = schedule.branchId;
    if (!branchId) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { organizationId: org.id, isActive: true },
      });
      branchId = defaultBranch?.id || '';
    }

    return this.create({
      organizationId: org.id,
      branchId,
      customerId: payload.customerId,
      studioScheduleId: payload.studioScheduleId,
      bookingDate: payload.bookingDate,
      status: BookingStatus.CONFIRMED,
    });
  }

  async cancelPublicBooking(slugOrId: string, bookingId: string, customerId: string) {
    const org = await this.resolveOrganizationBySlugOrId(slugOrId);

    const booking = await this.prisma.studioBooking.findFirst({
      where: {
        id: bookingId,
        organizationId: org.id,
        customerId,
      },
    });

    if (!booking) {
      throw new NotFoundException('No se encontró la reserva para este alumno');
    }

    return this.prisma.studioBooking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });
  }
}
