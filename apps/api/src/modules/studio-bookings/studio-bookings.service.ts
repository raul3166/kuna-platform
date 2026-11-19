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

    const isFull = confirmedCount >= schedule.capacity;
    const targetStatus = isFull
      ? dto.allowWaitlist || dto.status === BookingStatus.WAITLISTED
        ? BookingStatus.WAITLISTED
        : null
      : dto.status || BookingStatus.CONFIRMED;

    if (!targetStatus) {
      throw new BadRequestException(
        'La clase ya alcanzó el cupo máximo permitido. Puedes anotarte en la Lista de Espera.',
      );
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

    if (
      existingBooking &&
      (existingBooking.status === BookingStatus.CONFIRMED ||
        existingBooking.status === BookingStatus.WAITLISTED)
    ) {
      throw new ConflictException(
        existingBooking.status === BookingStatus.WAITLISTED
          ? 'El alumno ya se encuentra en la Lista de Espera de esta clase'
          : 'El alumno ya tiene una reserva confirmada para esta clase',
      );
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
        data: { status: targetStatus },
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
        status: targetStatus,
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

  private async promoteNextFromWaitlist(studioScheduleId: string, bookingDate: Date) {
    const nextInWaitlist = await this.prisma.studioBooking.findFirst({
      where: {
        studioScheduleId,
        bookingDate,
        status: BookingStatus.WAITLISTED,
      },
      include: {
        customer: true,
        schedule: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!nextInWaitlist) return null;

    return this.prisma.studioBooking.update({
      where: { id: nextInWaitlist.id },
      data: { status: BookingStatus.CONFIRMED },
      include: {
        customer: true,
        schedule: true,
      },
    });
  }

  async promoteWaitlistBooking(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.studioBooking.update({
      where: { id },
      data: { status: BookingStatus.CONFIRMED },
      include: { customer: true, schedule: { include: { instructor: true } } },
    });
  }

  async cancel(id: string, organizationId: string) {
    const booking = await this.findOne(id, organizationId);
    const wasConfirmed = booking.status === BookingStatus.CONFIRMED;

    const cancelled = await this.prisma.studioBooking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });

    const promoted = wasConfirmed
      ? await this.promoteNextFromWaitlist(booking.studioScheduleId, booking.bookingDate)
      : null;

    return {
      ...cancelled,
      promotedFromWaitlist: promoted,
    };
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

  async getStudioBookingSettings(organizationId: string) {
    if (!organizationId) {
      return { cancellationHoursBeforeClass: 2 };
    }
    const orgVert = await this.prisma.organizationVertical.findFirst({
      where: {
        organizationId,
        vertical: { code: 'STUDIO' },
      },
    });
    const cfg = (orgVert?.config as Record<string, any>) || {};
    const hours =
      cfg.cancellationHoursBeforeClass !== undefined && cfg.cancellationHoursBeforeClass !== null
        ? Math.max(0, Number(cfg.cancellationHoursBeforeClass))
        : 2;
    return {
      cancellationHoursBeforeClass: Number.isFinite(hours) ? hours : 2,
    };
  }

  async updateStudioBookingSettings(
    organizationId: string,
    payload: { cancellationHoursBeforeClass: number },
  ) {
    if (!organizationId) {
      throw new BadRequestException('organizationId es requerido');
    }
    const hours = Math.max(0, Number(payload.cancellationHoursBeforeClass ?? 2));

    let studioVertical = await this.prisma.vertical.findUnique({
      where: { code: 'STUDIO' },
    });
    if (!studioVertical) {
      studioVertical = await this.prisma.vertical.create({
        data: {
          code: 'STUDIO',
          name: 'Estudio (Yoga / Pilates / Barre)',
          icon: '🧘‍♀️',
          isActive: true,
        },
      });
    }

    const existing = await this.prisma.organizationVertical.findUnique({
      where: {
        organizationId_verticalId: {
          organizationId,
          verticalId: studioVertical.id,
        },
      },
    });

    const currentConfig = ((existing?.config as Record<string, any>) || {});
    const newConfig = {
      ...currentConfig,
      cancellationHoursBeforeClass: hours,
    };

    await this.prisma.organizationVertical.upsert({
      where: {
        organizationId_verticalId: {
          organizationId,
          verticalId: studioVertical.id,
        },
      },
      update: { config: newConfig },
      create: {
        organizationId,
        verticalId: studioVertical.id,
        isActive: true,
        config: newConfig,
      },
    });

    return { cancellationHoursBeforeClass: hours };
  }

  async getPublicCatalog(slugOrId: string, dateStr?: string) {
    const org = await this.resolveOrganizationBySlugOrId(slugOrId);
    const targetDateStr = dateStr || new Date().toISOString().split('T')[0];
    const targetDate = this.parseLocalDate(targetDateStr);

    const [branches, plans, schedules, bookingsForDate, bookingSettings] = await Promise.all([
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
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.WAITLISTED] },
        },
        select: { studioScheduleId: true, status: true },
      }),
      this.getStudioBookingSettings(org.id),
    ]);

    const reservedBySchedule: Record<string, number> = {};
    const waitlistBySchedule: Record<string, number> = {};
    for (const b of bookingsForDate) {
      if (b.status === BookingStatus.WAITLISTED) {
        waitlistBySchedule[b.studioScheduleId] = (waitlistBySchedule[b.studioScheduleId] || 0) + 1;
      } else {
        reservedBySchedule[b.studioScheduleId] = (reservedBySchedule[b.studioScheduleId] || 0) + 1;
      }
    }

    const enrichedSchedules = schedules.map((s) => {
      const reserved = reservedBySchedule[s.id] || 0;
      const waitlistCount = waitlistBySchedule[s.id] || 0;
      return {
        ...s,
        reservedCount: reserved,
        waitlistCount,
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
      bookingSettings,
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
        notes: true,
        medicalAlerts: true,
        loyaltyPoints: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(
        'No encontramos un alumno registrado con ese documento o correo en este estudio.',
      );
    }

    const [subscriptions, bookings, feedbacks, packageRequests] = await Promise.all([
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
      this.getStudentFeedbacks(org.id, customer.id),
      this.prisma.studioPackageRequest.findMany({
        where: {
          organizationId: org.id,
          customerId: customer.id,
        },
        include: {
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    return {
      customer,
      subscriptions,
      bookings,
      feedbacks,
      packageRequests,
    };
  }

  private feedbackTableReady = false;

  private async ensureFeedbackTable() {
    if (this.feedbackTableReady) return;
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "StudioClassFeedback" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "organizationId" TEXT NOT NULL,
          "customerId" TEXT NOT NULL,
          "customerName" TEXT NOT NULL,
          "studioScheduleId" TEXT NOT NULL,
          "className" TEXT NOT NULL,
          "instructorName" TEXT,
          "classDate" TEXT,
          "rating" INTEGER NOT NULL DEFAULT 5,
          "comment" TEXT,
          "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.feedbackTableReady = true;
    } catch {
      // Ignorar si ya existe
    }
  }

  private async getStudentFeedbacks(organizationId: string, customerId: string) {
    await this.ensureFeedbackTable();
    try {
      const rows = await this.prisma.$queryRaw<any[]>`
        SELECT
          "id",
          "studioScheduleId",
          "className",
          "instructorName",
          "classDate",
          "rating",
          "comment",
          "isAnonymous",
          "createdAt"
        FROM "StudioClassFeedback"
        WHERE "organizationId" = ${organizationId}
          AND "customerId" = ${customerId}
        ORDER BY "createdAt" DESC
        LIMIT 25
      `;
      return rows;
    } catch {
      return [];
    }
  }

  async submitPublicFeedback(
    slugOrId: string,
    payload: {
      customerId: string;
      studioScheduleId: string;
      classDate?: string;
      rating: number;
      comment?: string;
      isAnonymous?: boolean;
    },
  ) {
    await this.ensureFeedbackTable();
    const org = await this.resolveOrganizationBySlugOrId(slugOrId);

    const rating = Math.min(5, Math.max(1, Math.round(Number(payload.rating || 5))));

    const [customer, schedule] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: payload.customerId, organizationId: org.id },
      }),
      this.prisma.studioSchedule.findFirst({
        where: { id: payload.studioScheduleId, organizationId: org.id },
        include: { instructor: true },
      }),
    ]);

    if (!customer) {
      throw new NotFoundException('Alumno no encontrado en este estudio');
    }
    if (!schedule) {
      throw new NotFoundException('La clase seleccionada no pertenece a este estudio');
    }

    const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
    const instructorName = schedule.instructor
      ? [schedule.instructor.firstName, schedule.instructor.lastName].filter(Boolean).join(' ').trim()
      : schedule.instructorName || 'Sin asignar';

    const id = `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const cleanComment = (payload.comment || '').trim() || null;
    const classDate = (payload.classDate || new Date().toISOString().slice(0, 10)).slice(0, 10);
    const isAnonymous = Boolean(payload.isAnonymous);

    await this.prisma.$executeRaw`
      INSERT INTO "StudioClassFeedback" (
        "id",
        "organizationId",
        "customerId",
        "customerName",
        "studioScheduleId",
        "className",
        "instructorName",
        "classDate",
        "rating",
        "comment",
        "isAnonymous",
        "createdAt"
      ) VALUES (
        ${id},
        ${org.id},
        ${customer.id},
        ${customerName},
        ${schedule.id},
        ${schedule.className},
        ${instructorName},
        ${classDate},
        ${rating},
        ${cleanComment},
        ${isAnonymous},
        NOW()
      )
    `;

    return {
      id,
      className: schedule.className,
      instructorName,
      classDate,
      rating,
      comment: cleanComment,
      isAnonymous,
    };
  }

  async getOrganizationFeedback(organizationId: string) {
    await this.ensureFeedbackTable();
    const rows = await this.prisma.$queryRaw<any[]>`
      SELECT
        "id",
        "customerId",
        "customerName",
        "studioScheduleId",
        "className",
        "instructorName",
        "classDate",
        "rating",
        "comment",
        "isAnonymous",
        "createdAt"
      FROM "StudioClassFeedback"
      WHERE "organizationId" = ${organizationId}
      ORDER BY "createdAt" DESC
      LIMIT 200
    `;

    const totalFeedbacks = rows.length;
    const sumRating = rows.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    const averageRating = totalFeedbacks > 0 ? Number((sumRating / totalFeedbacks).toFixed(1)) : 0;

    const classMap = new Map<string, { className: string; instructorName: string; count: number; sum: number }>();
    for (const r of rows) {
      const key = `${r.className}__${r.instructorName || 'Sin asignar'}`;
      const cur = classMap.get(key) || {
        className: r.className,
        instructorName: r.instructorName || 'Sin asignar',
        count: 0,
        sum: 0,
      };
      cur.count += 1;
      cur.sum += Number(r.rating || 0);
      classMap.set(key, cur);
    }

    const byClass = Array.from(classMap.values())
      .map((c) => ({
        className: c.className,
        instructorName: c.instructorName,
        count: c.count,
        avgRating: Number((c.sum / c.count).toFixed(1)),
      }))
      .sort((a, b) => b.avgRating - a.avgRating || b.count - a.count);

    const items = rows.map((r) => ({
      id: r.id,
      customerName: r.isAnonymous ? 'Alumno Anónimo' : r.customerName,
      studioScheduleId: r.studioScheduleId,
      className: r.className,
      instructorName: r.instructorName || 'Sin asignar',
      classDate: r.classDate,
      rating: Number(r.rating || 5),
      comment: r.comment,
      isAnonymous: Boolean(r.isAnonymous),
      createdAt: r.createdAt,
    }));

    return {
      summary: {
        totalFeedbacks,
        averageRating,
        byClass,
      },
      items,
    };
  }

  async createPublicBooking(
    slugOrId: string,
    payload: {
      customerId: string;
      studioScheduleId: string;
      bookingDate: string;
      allowWaitlist?: boolean;
    },
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
      allowWaitlist: payload.allowWaitlist ?? true,
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
      include: {
        schedule: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('No se encontró la reserva para este alumno');
    }

    // Validar tiempo mínimo de anticipación configurado por el estudio (para reservas CONFIRMED)
    if (booking.status === BookingStatus.CONFIRMED && booking.schedule?.startTime) {
      const { cancellationHoursBeforeClass } = await this.getStudioBookingSettings(org.id);
      if (cancellationHoursBeforeClass > 0) {
        const bDateStr = new Date(booking.bookingDate).toISOString().split('T')[0];
        const [y, m, d] = bDateStr.split('-').map(Number);
        const [hh, mm] = String(booking.schedule.startTime).split(':').map(Number);
        const classStart = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
        const diffHours = (classStart.getTime() - Date.now()) / (1000 * 60 * 60);

        if (diffHours < cancellationHoursBeforeClass) {
          throw new BadRequestException(
            `Las reservas solo pueden cancelarse con al menos ${cancellationHoursBeforeClass} hora(s) de anticipación al inicio de la clase. Por favor comunícate con el estudio.`,
          );
        }
      }
    }

    const wasConfirmed = booking.status === BookingStatus.CONFIRMED;
    const cancelled = await this.prisma.studioBooking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });

    const promoted = wasConfirmed
      ? await this.promoteNextFromWaitlist(booking.studioScheduleId, booking.bookingDate)
      : null;

    return {
      ...cancelled,
      promotedFromWaitlist: promoted,
    };
  }

  async submitPublicPackageRequest(
    slugOrId: string,
    payload: {
      customerId: string;
      studioPlanId: string;
      paymentMethod?: string;
      amountPaid?: number;
      reference?: string;
      notes?: string;
    },
  ) {
    const org = await this.resolveOrganizationBySlugOrId(slugOrId);

    const [customer, plan, defaultBranch] = await Promise.all([
      this.prisma.customer.findFirst({
        where: { id: payload.customerId, organizationId: org.id },
      }),
      this.prisma.studioPlan.findFirst({
        where: { id: payload.studioPlanId, organizationId: org.id },
      }),
      this.prisma.branch.findFirst({
        where: { organizationId: org.id, isActive: true },
      }),
    ]);

    if (!customer) {
      throw new NotFoundException('Alumno no encontrado en este estudio');
    }
    if (!plan) {
      throw new NotFoundException('El paquete seleccionado no pertenece a este estudio');
    }

    const amountPaid =
      payload.amountPaid !== undefined && payload.amountPaid !== null
        ? Math.max(0, Number(payload.amountPaid))
        : Number(plan.price || 0);

    return this.prisma.studioPackageRequest.create({
      data: {
        organizationId: org.id,
        branchId: plan.branchId || defaultBranch?.id || null,
        customerId: customer.id,
        studioPlanId: plan.id,
        paymentMethod: payload.paymentMethod || 'TRANSFER',
        amountPaid,
        reference: payload.reference?.trim() || null,
        notes: payload.notes?.trim() || null,
        status: 'PENDING',
      },
      include: {
        plan: true,
        customer: true,
      },
    });
  }

  async updatePublicMedicalAlerts(
    slugOrId: string,
    payload: { customerId: string; medicalAlerts?: string },
  ) {
    const org = await this.resolveOrganizationBySlugOrId(slugOrId);
    const customer = await this.prisma.customer.findFirst({
      where: { id: payload.customerId, organizationId: org.id },
    });

    if (!customer) {
      throw new NotFoundException('Alumno no encontrado en este estudio');
    }

    return this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        medicalAlerts: payload.medicalAlerts?.trim() || null,
      },
    });
  }
}
