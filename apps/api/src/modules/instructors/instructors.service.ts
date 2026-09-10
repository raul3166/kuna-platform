import { Injectable, NotFoundException } from '@nestjs/common';
import { InstructorPaymentModel } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateInstructorDto, UpdateInstructorDto, CreateInstructorOverrideDto } from './dto/instructor.dto';

const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
const localDate = (value: string) => new Date(`${value}T00:00:00`);

@Injectable()
export class InstructorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(organizationId: string, branchId?: string) {
    return this.prisma.instructor.findMany({
      where: { organizationId, ...(branchId ? { branchId } : {}) },
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }],
    });
  }

  async findOne(id: string, organizationId: string) {
    const instructor = await this.prisma.instructor.findFirst({ where: { id, organizationId } });
    if (!instructor) throw new NotFoundException('Instructor no encontrado');
    return instructor;
  }

  create(dto: CreateInstructorDto) {
    return this.prisma.instructor.create({ data: dto });
  }

  async update(id: string, organizationId: string, dto: UpdateInstructorDto) {
    await this.findOne(id, organizationId);
    return this.prisma.instructor.update({ where: { id }, data: dto });
  }

  async remove(id: string, organizationId: string) {
    await this.findOne(id, organizationId);
    return this.prisma.instructor.update({ where: { id }, data: { isActive: false } });
  }

  async setOverride(dto: CreateInstructorOverrideDto) {
    const schedule = await this.prisma.studioSchedule.findFirst({
      where: { id: dto.studioScheduleId, organizationId: dto.organizationId },
    });
    if (!schedule) throw new NotFoundException('Horario no encontrado');
    await this.findOne(dto.instructorId, dto.organizationId);
    return this.prisma.studioClassInstructor.upsert({
      where: { studioScheduleId_classDate: { studioScheduleId: dto.studioScheduleId, classDate: localDate(dto.classDate) } },
      create: { studioScheduleId: dto.studioScheduleId, instructorId: dto.instructorId, classDate: localDate(dto.classDate), notes: dto.notes },
      update: { instructorId: dto.instructorId, notes: dto.notes },
      include: { instructor: true, schedule: true },
    });
  }

  assignments(organizationId: string, branchId?: string) {
    return this.prisma.studioSchedule.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
        OR: [
          { instructorId: { not: null } },
          { classInstructors: { some: {} } },
        ],
      },
      include: {
        instructor: true,
        classInstructors: {
          include: { instructor: true },
          orderBy: { classDate: 'asc' },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async settlement(organizationId: string, startDate: string, endDate: string, instructorId?: string, branchId?: string) {
    const start = localDate(startDate);
    const end = localDate(endDate);
    end.setHours(23, 59, 59, 999);
    const schedules = await this.prisma.studioSchedule.findMany({
      where: { organizationId, isActive: true, ...(branchId ? { branchId } : {}) },
      include: {
        instructor: true,
        classInstructors: { where: { classDate: { gte: start, lte: end } }, include: { instructor: true } },
      },
    });
    const attendance = await this.prisma.studioAttendanceLog.findMany({
      where: { organizationId, status: 'ALLOWED', studioScheduleId: { not: null }, checkInAt: { gte: start, lte: end }, ...(branchId ? { branchId } : {}) },
      select: { studioScheduleId: true, checkInAt: true },
    });
    const attendees = new Map<string, number>();
    attendance.forEach(item => {
      const key = `${item.studioScheduleId}:${dateOnly(item.checkInAt)}`;
      attendees.set(key, (attendees.get(key) || 0) + 1);
    });
    const details: any[] = [];
    for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const classDate = dateOnly(cursor);
      for (const schedule of schedules.filter(item => item.dayOfWeek === cursor.getDay())) {
        const override = schedule.classInstructors.find(item => dateOnly(item.classDate) === classDate);
        const instructor = override?.instructor || schedule.instructor;
        if (!instructor || (instructorId && instructor.id !== instructorId)) continue;
        const studentCount = attendees.get(`${schedule.id}:${classDate}`) || 0;
        const fixed = instructor.paymentModel === InstructorPaymentModel.PER_STUDENT ? 0 : Number(instructor.fixedClassRate);
        const perStudent = instructor.paymentModel === InstructorPaymentModel.FIXED_PER_CLASS ? 0 : Number(instructor.perStudentRate) * studentCount;
        details.push({ classDate, scheduleId: schedule.id, className: schedule.className, startTime: schedule.startTime, instructor, isReplacement: Boolean(override), attendees: studentCount, fixedAmount: fixed, studentAmount: perStudent, total: fixed + perStudent });
      }
    }
    const totalClasses = details.length;
    const totalAttendees = details.reduce((sum, item) => sum + item.attendees, 0);
    const totalPayment = details.reduce((sum, item) => sum + item.total, 0);
    return { startDate, endDate, totalClasses, totalAttendees, totalPayment, details };
  }
}
