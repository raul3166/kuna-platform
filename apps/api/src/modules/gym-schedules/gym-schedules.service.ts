import { Injectable, NotFoundException } from '@nestjs/common';
import { InstructorPaymentModel } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateGymScheduleDto, UpdateGymScheduleDto, CreateGymShiftOverrideDto } from './dto/gym-schedule.dto';

const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
const localDate = (value: string) => new Date(`${value}T00:00:00`);

const getTimeInZone = (date: Date, timeZone = 'America/Bogota'): string => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return date.toISOString().slice(11, 16);
  }
};

const getDateInZone = (date: Date, timeZone = 'America/Bogota'): string => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

@Injectable()
export class GymSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string, branchId?: string) {
    return this.prisma.gymSchedule.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        instructor: true,
        shiftInstructors: {
          include: { instructor: true },
          orderBy: { shiftDate: 'asc' },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const schedule = await this.prisma.gymSchedule.findFirst({
      where: { id, organizationId },
      include: { instructor: true, shiftInstructors: { include: { instructor: true } } },
    });
    if (!schedule) throw new NotFoundException('Turno de gimnasio no encontrado');
    return schedule;
  }

  create(dto: CreateGymScheduleDto) {
    return this.prisma.gymSchedule.create({
      data: dto,
      include: { instructor: true },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateGymScheduleDto) {
    await this.findOne(id, organizationId);
    return this.prisma.gymSchedule.update({
      where: { id },
      data: dto,
      include: { instructor: true },
    });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.gymSchedule.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async setOverride(dto: CreateGymShiftOverrideDto) {
    const schedule = await this.prisma.gymSchedule.findFirst({
      where: { id: dto.gymScheduleId, organizationId: dto.organizationId },
    });
    if (!schedule) throw new NotFoundException('Turno no encontrado');

    const instructor = await this.prisma.instructor.findFirst({
      where: { id: dto.instructorId, organizationId: dto.organizationId },
    });
    if (!instructor) throw new NotFoundException('Instructor no encontrado');

    return this.prisma.gymShiftInstructor.upsert({
      where: {
        gymScheduleId_shiftDate: {
          gymScheduleId: dto.gymScheduleId,
          shiftDate: localDate(dto.shiftDate),
        },
      },
      create: {
        gymScheduleId: dto.gymScheduleId,
        instructorId: dto.instructorId,
        shiftDate: localDate(dto.shiftDate),
        notes: dto.notes,
      },
      update: {
        instructorId: dto.instructorId,
        notes: dto.notes,
      },
      include: { instructor: true, schedule: true },
    });
  }

  async settlement(
    organizationId: string,
    startDate: string,
    endDate: string,
    instructorId?: string,
    branchId?: string,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true },
    });
    const timezone = org?.timezone || 'America/Bogota';

    const start = localDate(startDate);
    const end = localDate(endDate);
    end.setHours(23, 59, 59, 999);

    const schedules = await this.prisma.gymSchedule.findMany({
      where: {
        organizationId,
        isActive: true,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        instructor: true,
        shiftInstructors: {
          where: { shiftDate: { gte: start, lte: end } },
          include: { instructor: true },
        },
      },
    });

    // Check-ins reales de socios en el gimnasio durante el período
    const checkIns = await this.prisma.gymAttendanceLog.findMany({
      where: {
        organizationId,
        status: 'ALLOWED',
        checkInAt: { gte: start, lte: end },
        ...(branchId ? { branchId } : {}),
      },
      select: {
        id: true,
        checkInAt: true,
        customerId: true,
      },
    });

    // Mapear check-ins con su fecha local YYYY-MM-DD y hora HH:mm
    const parsedLogs = checkIns.map((item) => ({
      dateStr: getDateInZone(item.checkInAt, timezone),
      timeStr: getTimeInZone(item.checkInAt, timezone),
      customerId: item.customerId,
    }));

    const details: any[] = [];

    // Iterar cada día del rango solicitado
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const currentDayOfWeek = cursor.getDay();
      const currentDayStr = dateOnly(cursor);

      // Turnos correspondientes a este día de la semana
      const daySchedules = schedules.filter((s) => s.dayOfWeek === currentDayOfWeek);

      for (const schedule of daySchedules) {
        // Verificar si hubo reemplazo asignado para esta fecha específica
        const override = schedule.shiftInstructors.find(
          (o) => dateOnly(o.shiftDate) === currentDayStr,
        );
        const effectiveInstructor = override?.instructor || schedule.instructor;

        if (!effectiveInstructor) continue;
        if (instructorId && effectiveInstructor.id !== instructorId) continue;

        // Filtrar check-ins que ocurrieron en esta fecha dentro de la franja [startTime, endTime]
        const attendeesInShift = parsedLogs.filter(
          (log) =>
            log.dateStr === currentDayStr &&
            log.timeStr >= schedule.startTime &&
            log.timeStr <= schedule.endTime,
        );

        const studentCount = attendeesInShift.length;

        const fixed =
          effectiveInstructor.paymentModel === InstructorPaymentModel.PER_STUDENT
            ? 0
            : Number(effectiveInstructor.fixedClassRate);

        const studentAmount =
          effectiveInstructor.paymentModel === InstructorPaymentModel.FIXED_PER_CLASS
            ? 0
            : Number(effectiveInstructor.perStudentRate) * studentCount;

        const total = fixed + studentAmount;

        details.push({
          shiftDate: currentDayStr,
          scheduleId: schedule.id,
          shiftName: schedule.name,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          instructor: effectiveInstructor,
          isReplacement: Boolean(override),
          attendees: studentCount,
          fixedAmount: fixed,
          studentAmount,
          total,
        });
      }
    }

    const totalShifts = details.length;
    const totalAttendees = details.reduce((sum, item) => sum + item.attendees, 0);
    const totalPayment = details.reduce((sum, item) => sum + item.total, 0);

    return {
      startDate,
      endDate,
      totalShifts,
      totalAttendees,
      totalPayment,
      details,
    };
  }
}

