import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  Prisma,
  ServiceOrderStatus,
} from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  CreateBeautyNoteDto,
  CreateTimeOffDto,
  RescheduleAppointmentDto,
  SetWorkerScheduleDto,
  UpdateAppointmentStatusDto,
  UpdateBeautyConfigDto,
} from './dto/beauty-misc.dto';

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.IN_SERVICE,
];

const DEFAULT_CONFIG = {
  slotMinutes: 30,
  dayStart: '08:00',
  dayEnd: '20:00',
  allowOverlap: false,
};

@Injectable()
export class BeautyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serviceOrders: ServiceOrdersService,
  ) {}

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------

  async resolveOrganizationId(
    organizationId?: string,
    userId?: string,
  ): Promise<string> {
    if (organizationId) return organizationId;

    if (userId) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (dbUser?.organizationId) return dbUser.organizationId;
    }

    const firstOrg = await this.prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
    });
    if (firstOrg?.id) return firstOrg.id;

    throw new BadRequestException('No se pudo determinar la organización activa.');
  }

  private resolveBranchId(branchId?: string): string {
    if (!branchId) {
      throw new BadRequestException(
        'La sucursal es obligatoria (header x-branch-id o branchId).',
      );
    }
    return branchId;
  }

  /** Interpreta 'YYYY-MM-DD' como fecha local (no UTC) para no desfasar el día. */
  private parseDay(value: string | Date): Date {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(value);
  }

  private startOfDay(date: string | Date): Date {
    const d = this.parseDay(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private endOfDay(date: string | Date): Date {
    const d = this.parseDay(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private toMinutes(hhmm: string): number {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  private async assertBranch(orgId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, organizationId: orgId },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException('La sucursal no existe en esta organización.');
    }
  }

  private async findAppointmentOrFail(id: string, orgId: string) {
    const appt = await this.prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        worker: true,
        items: { include: { serviceItem: true, worker: true } },
        serviceOrder: true,
      },
    });
    if (!appt) throw new NotFoundException('Cita no encontrada.');
    return appt;
  }

  /**
   * Verifica que el profesional pueda atender en el rango: horario laboral,
   * ausencias y cruces con otras citas activas.
   */
  private async assertWorkerAvailable(params: {
    orgId: string;
    branchId: string;
    workerId: string;
    startAt: Date;
    endAt: Date;
    ignoreAppointmentId?: string;
    allowOverlap: boolean;
  }) {
    const { orgId, branchId, workerId, startAt, endAt } = params;

    const schedules = await this.prisma.beautyWorkerSchedule.findMany({
      where: { organizationId: orgId, workerId, branchId, isActive: true },
    });

    // Si el profesional tiene horario configurado, la cita debe caber en él.
    if (schedules.length > 0) {
      const block = schedules.find((s) => s.dayOfWeek === startAt.getDay());
      if (!block) {
        throw new ConflictException('El profesional no trabaja ese día.');
      }
      const startMin = startAt.getHours() * 60 + startAt.getMinutes();
      const endMin = endAt.getHours() * 60 + endAt.getMinutes();
      if (
        startAt.toDateString() !== endAt.toDateString() ||
        startMin < this.toMinutes(block.startTime) ||
        endMin > this.toMinutes(block.endTime)
      ) {
        throw new ConflictException(
          `Fuera del horario del profesional (${block.startTime} - ${block.endTime}).`,
        );
      }
    }

    const timeOff = await this.prisma.beautyTimeOff.findFirst({
      where: {
        organizationId: orgId,
        workerId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (timeOff) {
      throw new ConflictException(
        `El profesional tiene una ausencia programada${timeOff.reason ? `: ${timeOff.reason}` : '.'}`,
      );
    }

    if (!params.allowOverlap) {
      const clash = await this.prisma.appointment.findFirst({
        where: {
          organizationId: orgId,
          workerId,
          status: { in: ACTIVE_STATUSES },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
          ...(params.ignoreAppointmentId
            ? { id: { not: params.ignoreAppointmentId } }
            : {}),
        },
        select: { appointmentNumber: true },
      });
      if (clash) {
        throw new ConflictException(
          `El profesional ya tiene la cita ${clash.appointmentNumber} en ese horario.`,
        );
      }
    }
  }

  // ------------------------------------------------------------------
  // Dashboard
  // ------------------------------------------------------------------

  async getDashboard(
    organizationId?: string,
    branchId?: string,
    date?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const day = date ? this.parseDay(date) : new Date();
    const from = this.startOfDay(day);
    const to = this.endOfDay(day);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        organizationId: orgId,
        ...(branchId ? { branchId } : {}),
        startAt: { gte: from, lte: to },
      },
      include: {
        customer: true,
        worker: true,
        items: { include: { serviceItem: true } },
      },
      orderBy: { startAt: 'asc' },
    });

    const count = (s: AppointmentStatus) =>
      appointments.filter((a) => a.status === s).length;

    const projectedRevenue = appointments
      .filter((a) => a.status !== 'CANCELLED' && a.status !== 'NO_SHOW')
      .reduce((acc, a) => acc + Number(a.totalEstimated || 0), 0);
    const realizedRevenue = appointments
      .filter((a) => a.status === 'COMPLETED')
      .reduce((acc, a) => acc + Number(a.totalEstimated || 0), 0);

    const byWorker = new Map<
      string,
      { workerId: string; name: string; appointments: number; revenue: number }
    >();
    for (const a of appointments) {
      if (!a.worker || a.status === 'CANCELLED' || a.status === 'NO_SHOW') continue;
      const key = a.worker.id;
      const entry = byWorker.get(key) ?? {
        workerId: key,
        name: `${a.worker.firstName} ${a.worker.lastName ?? ''}`.trim(),
        appointments: 0,
        revenue: 0,
      };
      entry.appointments += 1;
      entry.revenue += Number(a.totalEstimated || 0);
      byWorker.set(key, entry);
    }

    return {
      date: from.toISOString(),
      kpis: {
        total: appointments.length,
        scheduled: count('SCHEDULED'),
        confirmed: count('CONFIRMED'),
        inService: count('IN_SERVICE'),
        completed: count('COMPLETED'),
        cancelled: count('CANCELLED'),
        noShow: count('NO_SHOW'),
        projectedRevenue,
        realizedRevenue,
      },
      workers: Array.from(byWorker.values()),
      appointments,
    };
  }

  // ------------------------------------------------------------------
  // Citas
  // ------------------------------------------------------------------

  async findAppointments(
    organizationId: string | undefined,
    filters: {
      from?: string;
      to?: string;
      workerId?: string;
      branchId?: string;
      status?: AppointmentStatus;
      customerId?: string;
    },
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    return this.prisma.appointment.findMany({
      where: {
        organizationId: orgId,
        ...(filters.branchId ? { branchId: filters.branchId } : {}),
        ...(filters.workerId ? { workerId: filters.workerId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.customerId ? { customerId: filters.customerId } : {}),
        ...(filters.from || filters.to
          ? {
              startAt: {
                ...(filters.from ? { gte: this.startOfDay(filters.from) } : {}),
                ...(filters.to ? { lte: this.endOfDay(filters.to) } : {}),
              },
            }
          : {}),
      },
      include: {
        customer: true,
        worker: true,
        items: { include: { serviceItem: true, worker: true } },
        serviceOrder: { select: { id: true, orderNumber: true, status: true, saleId: true } },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async findOneAppointment(id: string, organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    return this.findAppointmentOrFail(id, orgId);
  }

  async createAppointment(dto: CreateAppointmentDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);
    const branchId = this.resolveBranchId(dto.branchId);
    await this.assertBranch(orgId, branchId);

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId: orgId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('El cliente no existe en esta organización.');

    if (dto.workerId) {
      const worker = await this.prisma.serviceWorker.findFirst({
        where: { id: dto.workerId, organizationId: orgId, isActive: true },
        select: { id: true },
      });
      if (!worker) throw new NotFoundException('El profesional no existe o está inactivo.');
    }

    const serviceIds = dto.items.map((i) => i.serviceItemId);
    const services = await this.prisma.serviceItem.findMany({
      where: { id: { in: serviceIds }, organizationId: orgId, isActive: true },
    });
    const serviceMap = new Map(services.map((s) => [s.id, s]));
    for (const id of serviceIds) {
      if (!serviceMap.has(id)) {
        throw new NotFoundException(`El servicio ${id} no existe o está inactivo.`);
      }
    }

    for (const it of dto.items) {
      if (!it.workerId) continue;
      const w = await this.prisma.serviceWorker.findFirst({
        where: { id: it.workerId, organizationId: orgId, isActive: true },
        select: { id: true },
      });
      if (!w) throw new NotFoundException('Un profesional de los servicios no existe.');
    }

    const totalMinutes = dto.items.reduce(
      (acc, i) => acc + (serviceMap.get(i.serviceItemId)!.estimatedMinutes || 30),
      0,
    );
    const total = dto.items.reduce(
      (acc, i) => acc + Number(serviceMap.get(i.serviceItemId)!.basePrice || 0),
      0,
    );

    const startAt = new Date(dto.startAt);
    if (Number.isNaN(startAt.getTime())) throw new BadRequestException('Fecha inválida.');
    const endAt = new Date(startAt.getTime() + totalMinutes * 60_000);

    const config = (await this.getConfig(orgId, userId)).config;

    if (dto.workerId) {
      await this.assertWorkerAvailable({
        orgId,
        branchId,
        workerId: dto.workerId,
        startAt,
        endAt,
        allowOverlap: !!config.allowOverlap,
      });
    }

    const appointmentNumber = `CIT-${Date.now().toString().slice(-8)}`;

    return this.prisma.appointment.create({
      data: {
        organizationId: orgId,
        branchId,
        customerId: dto.customerId,
        workerId: dto.workerId,
        appointmentNumber,
        startAt,
        endAt,
        totalEstimated: total,
        notes: dto.notes,
        items: {
          create: dto.items.map((i) => {
            const svc = serviceMap.get(i.serviceItemId)!;
            return {
              organizationId: orgId,
              serviceItemId: i.serviceItemId,
              workerId: i.workerId ?? dto.workerId,
              price: svc.basePrice,
              durationMinutes: svc.estimatedMinutes || 30,
            };
          }),
        },
      },
      include: {
        customer: true,
        worker: true,
        items: { include: { serviceItem: true } },
      },
    });
  }

  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    organizationId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const appt = await this.findAppointmentOrFail(id, orgId);

    if (!ACTIVE_STATUSES.includes(appt.status) || appt.status === 'IN_SERVICE') {
      throw new ConflictException('Solo se pueden reprogramar citas pendientes o confirmadas.');
    }

    const duration = appt.endAt.getTime() - appt.startAt.getTime();
    const startAt = new Date(dto.startAt);
    const endAt = new Date(startAt.getTime() + duration);
    const workerId = dto.workerId ?? appt.workerId ?? undefined;

    if (workerId) {
      const config = (await this.getConfig(orgId, userId)).config;
      await this.assertWorkerAvailable({
        orgId,
        branchId: appt.branchId,
        workerId,
        startAt,
        endAt,
        ignoreAppointmentId: appt.id,
        allowOverlap: !!config.allowOverlap,
      });
    }

    return this.prisma.appointment.update({
      where: { id: appt.id },
      data: { startAt, endAt, workerId, status: AppointmentStatus.SCHEDULED },
      include: { customer: true, worker: true, items: { include: { serviceItem: true } } },
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateAppointmentStatusDto,
    organizationId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const appt = await this.findAppointmentOrFail(id, orgId);

    const allowed: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
      SCHEDULED: ['CONFIRMED', 'CANCELLED', 'NO_SHOW'],
      CONFIRMED: ['CANCELLED', 'NO_SHOW'],
    };
    if (!allowed[appt.status]?.includes(dto.status)) {
      throw new ConflictException(
        `Transición no permitida: ${appt.status} → ${dto.status}. Use start/complete para el servicio.`,
      );
    }

    return this.prisma.appointment.update({
      where: { id: appt.id },
      data: {
        status: dto.status,
        ...(dto.status === 'CANCELLED' || dto.status === 'NO_SHOW'
          ? { cancelReason: dto.reason }
          : {}),
      },
    });
  }

  /**
   * Inicia el servicio: genera la ServiceOrder (Core) con una tarea por servicio,
   * asignada al profesional. De ahí en adelante comisiones, insumos y cobro POS
   * usan el flujo existente de Órdenes de Servicio.
   */
  async startService(id: string, organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const appt = await this.findAppointmentOrFail(id, orgId);

    if (appt.serviceOrderId) {
      throw new ConflictException('La cita ya tiene una orden de servicio asociada.');
    }
    if (appt.status !== 'SCHEDULED' && appt.status !== 'CONFIRMED') {
      throw new ConflictException('Solo se puede iniciar una cita pendiente o confirmada.');
    }

    const customerName =
      `${appt.customer.firstName} ${appt.customer.lastName ?? ''}`.trim();
    const total = Number(appt.totalEstimated || 0);

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.create({
        data: {
          organizationId: orgId,
          branchId: appt.branchId,
          customerId: appt.customerId,
          orderNumber: `SO-BEA-${Date.now().toString().slice(-8)}`,
          assetName: `Cita ${appt.appointmentNumber} - ${customerName}`,
          assetIdentifier: appt.appointmentNumber,
          status: ServiceOrderStatus.IN_PROGRESS,
          assignedWorkerId: appt.workerId ?? undefined,
          initialNotes: appt.notes ?? undefined,
          scheduledAt: appt.startAt,
          laborTotal: total,
          materialsTotal: 0,
          total,
          tasks: {
            create: appt.items.map((i) => ({
              serviceItemId: i.serviceItemId,
              description: i.serviceItem.name,
              assignedWorkerId: i.workerId ?? appt.workerId ?? undefined,
              price: i.price,
            })),
          },
        },
      });

      const updated = await tx.appointment.update({
        where: { id: appt.id },
        data: { status: AppointmentStatus.IN_SERVICE, serviceOrderId: order.id },
        include: { customer: true, worker: true, items: { include: { serviceItem: true } } },
      });

      return { appointment: updated, serviceOrder: order };
    });
  }

  /**
   * Finaliza el servicio reutilizando ServiceOrdersService (descuenta insumos
   * una sola vez) y deja la orden lista para cobrar en el POS.
   */
  async completeService(id: string, organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const appt = await this.findAppointmentOrFail(id, orgId);

    if (appt.status !== 'IN_SERVICE' || !appt.serviceOrderId) {
      throw new ConflictException('La cita no está en servicio.');
    }

    await this.prisma.serviceOrderTask.updateMany({
      where: { serviceOrderId: appt.serviceOrderId },
      data: { isCompleted: true },
    });
    await this.serviceOrders.updateStatus(
      appt.serviceOrderId,
      orgId,
      ServiceOrderStatus.COMPLETED,
      userId,
    );

    const updated = await this.prisma.appointment.update({
      where: { id: appt.id },
      data: { status: AppointmentStatus.COMPLETED },
    });

    return { appointment: updated, serviceOrderId: appt.serviceOrderId };
  }

  // ------------------------------------------------------------------
  // Disponibilidad
  // ------------------------------------------------------------------

  async getAvailability(
    organizationId: string | undefined,
    q: {
      workerId: string;
      branchId: string;
      date: string;
      durationMinutes?: number;
    },
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const branchId = this.resolveBranchId(q.branchId);
    const config = (await this.getConfig(orgId, userId)).config;
    const duration = Math.max(Number(q.durationMinutes) || config.slotMinutes, 5);

    const day = this.parseDay(q.date);
    const from = this.startOfDay(day);
    const to = this.endOfDay(day);

    const schedules = await this.prisma.beautyWorkerSchedule.findMany({
      where: { organizationId: orgId, workerId: q.workerId, branchId, isActive: true },
    });

    let openMin = this.toMinutes(config.dayStart);
    let closeMin = this.toMinutes(config.dayEnd);
    if (schedules.length > 0) {
      const block = schedules.find((s) => s.dayOfWeek === day.getDay());
      if (!block) return { date: from.toISOString(), slots: [] };
      openMin = this.toMinutes(block.startTime);
      closeMin = this.toMinutes(block.endTime);
    }

    const [busy, offs] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          organizationId: orgId,
          workerId: q.workerId,
          status: { in: ACTIVE_STATUSES },
          startAt: { lt: to },
          endAt: { gt: from },
        },
        select: { startAt: true, endAt: true },
      }),
      this.prisma.beautyTimeOff.findMany({
        where: {
          organizationId: orgId,
          workerId: q.workerId,
          startAt: { lt: to },
          endAt: { gt: from },
        },
        select: { startAt: true, endAt: true },
      }),
    ]);

    const blocked = config.allowOverlap ? offs : [...busy, ...offs];
    const now = new Date();
    const slots: { start: string; end: string }[] = [];

    for (let m = openMin; m + duration <= closeMin; m += config.slotMinutes) {
      const s = new Date(from);
      s.setMinutes(m);
      const e = new Date(s.getTime() + duration * 60_000);
      if (e <= now) continue;
      const clash = blocked.some((b) => b.startAt < e && b.endAt > s);
      if (!clash) slots.push({ start: s.toISOString(), end: e.toISOString() });
    }

    return { date: from.toISOString(), durationMinutes: duration, slots };
  }

  // ------------------------------------------------------------------
  // Horarios y ausencias de profesionales
  // ------------------------------------------------------------------

  async getWorkerSchedule(
    workerId: string,
    organizationId?: string,
    branchId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    return this.prisma.beautyWorkerSchedule.findMany({
      where: { organizationId: orgId, workerId, ...(branchId ? { branchId } : {}) },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async setWorkerSchedule(
    workerId: string,
    dto: SetWorkerScheduleDto,
    organizationId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const branchId = this.resolveBranchId(dto.branchId);
    await this.assertBranch(orgId, branchId);

    const worker = await this.prisma.serviceWorker.findFirst({
      where: { id: workerId, organizationId: orgId },
      select: { id: true },
    });
    if (!worker) throw new NotFoundException('Profesional no encontrado.');

    const days = new Set<number>();
    for (const b of dto.blocks) {
      if (days.has(b.dayOfWeek)) {
        throw new BadRequestException('Hay días repetidos en el horario.');
      }
      days.add(b.dayOfWeek);
      if (this.toMinutes(b.startTime) >= this.toMinutes(b.endTime)) {
        throw new BadRequestException(
          `El horario del día ${b.dayOfWeek} es inválido (inicio >= fin).`,
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.beautyWorkerSchedule.deleteMany({
        where: { organizationId: orgId, workerId, branchId },
      }),
      this.prisma.beautyWorkerSchedule.createMany({
        data: dto.blocks.map((b) => ({
          organizationId: orgId,
          branchId,
          workerId,
          dayOfWeek: b.dayOfWeek,
          startTime: b.startTime,
          endTime: b.endTime,
          isActive: b.isActive ?? true,
        })),
      }),
    ]);

    return this.getWorkerSchedule(workerId, orgId, branchId);
  }

  async listTimeOff(
    organizationId?: string,
    workerId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    return this.prisma.beautyTimeOff.findMany({
      where: { organizationId: orgId, ...(workerId ? { workerId } : {}) },
      include: { worker: true },
      orderBy: { startAt: 'desc' },
    });
  }

  async createTimeOff(dto: CreateTimeOffDto, organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) {
      throw new BadRequestException('La fecha fin debe ser posterior al inicio.');
    }
    const worker = await this.prisma.serviceWorker.findFirst({
      where: { id: dto.workerId, organizationId: orgId },
      select: { id: true },
    });
    if (!worker) throw new NotFoundException('Profesional no encontrado.');

    return this.prisma.beautyTimeOff.create({
      data: {
        organizationId: orgId,
        workerId: dto.workerId,
        startAt,
        endAt,
        reason: dto.reason,
      },
    });
  }

  async removeTimeOff(id: string, organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const found = await this.prisma.beautyTimeOff.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Ausencia no encontrada.');
    await this.prisma.beautyTimeOff.delete({ where: { id } });
    return { message: 'Ausencia eliminada.' };
  }

  // ------------------------------------------------------------------
  // Historial / notas del cliente (fórmulas, preferencias)
  // ------------------------------------------------------------------

  async getCustomerHistory(
    customerId: string,
    organizationId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, organizationId: orgId },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');

    const [notes, appointments] = await Promise.all([
      this.prisma.beautyClientNote.findMany({
        where: { organizationId: orgId, customerId },
        include: { worker: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.appointment.findMany({
        where: { organizationId: orgId, customerId },
        include: { worker: true, items: { include: { serviceItem: true } } },
        orderBy: { startAt: 'desc' },
        take: 50,
      }),
    ]);

    const completed = appointments.filter((a) => a.status === 'COMPLETED');
    return {
      customer,
      stats: {
        visits: completed.length,
        noShows: appointments.filter((a) => a.status === 'NO_SHOW').length,
        totalSpent: completed.reduce((acc, a) => acc + Number(a.totalEstimated || 0), 0),
        lastVisit: completed[0]?.startAt ?? null,
      },
      notes,
      appointments,
    };
  }

  async createNote(dto: CreateBeautyNoteDto, organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId: orgId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');

    return this.prisma.beautyClientNote.create({
      data: {
        organizationId: orgId,
        customerId: dto.customerId,
        workerId: dto.workerId,
        title: dto.title,
        content: dto.content,
      },
    });
  }

  async removeNote(id: string, organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const found = await this.prisma.beautyClientNote.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Nota no encontrada.');
    await this.prisma.beautyClientNote.delete({ where: { id } });
    return { message: 'Nota eliminada.' };
  }

  // ------------------------------------------------------------------
  // Configuración del vertical
  // ------------------------------------------------------------------

  async getConfig(organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const vertical = await this.prisma.vertical.findUnique({ where: { code: 'BEAUTY' } });
    if (!vertical) {
      throw new NotFoundException('El vertical BEAUTY no está registrado en el catálogo maestro.');
    }

    const orgVertical = await this.prisma.organizationVertical.findUnique({
      where: {
        organizationId_verticalId: { organizationId: orgId, verticalId: vertical.id },
      },
    });

    return {
      organizationId: orgId,
      isActive: orgVertical?.isActive ?? false,
      config: { ...DEFAULT_CONFIG, ...((orgVertical?.config as object) || {}) } as typeof DEFAULT_CONFIG,
    };
  }

  async updateConfig(
    organizationId: string | undefined,
    dto: UpdateBeautyConfigDto,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const vertical = await this.prisma.vertical.findUnique({ where: { code: 'BEAUTY' } });
    if (!vertical) throw new NotFoundException('El vertical BEAUTY no existe.');

    const current = await this.getConfig(orgId, userId);
    const updated = { ...current.config, ...dto } as Prisma.InputJsonValue;

    const saved = await this.prisma.organizationVertical.upsert({
      where: {
        organizationId_verticalId: { organizationId: orgId, verticalId: vertical.id },
      },
      update: { config: updated },
      create: { organizationId: orgId, verticalId: vertical.id, isActive: true, config: updated },
    });

    return {
      message: 'Configuración de Belleza actualizada exitosamente.',
      config: saved.config,
    };
  }
}
