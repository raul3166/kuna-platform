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
}
