import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstructorPaymentModel } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateInstructorDto, UpdateInstructorDto, CreateInstructorOverrideDto } from './dto/instructor.dto';

const dateOnly = (value: Date) => value.toISOString().slice(0, 10);
const localDate = (value: string) => new Date(`${value}T00:00:00`);

@Injectable()
export class InstructorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, branchId?: string, businessType?: string) {
    // Auto-sincronizar usuarios que ya tengan rol STUDIO_INSTRUCTOR o GYM_TRAINER pero aún no estén en la tabla Instructor
    const roleCodesToSync =
      businessType === 'GYM'
        ? ['GYM_TRAINER']
        : businessType === 'STUDIO'
          ? ['STUDIO_INSTRUCTOR']
          : ['STUDIO_INSTRUCTOR', 'GYM_TRAINER'];

    const roleUsers = await this.prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        userRoles: {
          some: {
            role: {
              code: { in: roleCodesToSync },
            },
          },
        },
      },
      include: {
        userRoles: { include: { role: true } },
      },
    });

    if (roleUsers.length > 0) {
      const existingAll = await this.prisma.instructor.findMany({
        where: { organizationId },
        select: { id: true, email: true },
      });
      const existingEmailSet = new Set(
        existingAll
          .map((i) => i.email?.trim().toLowerCase())
          .filter((e): e is string => Boolean(e)),
      );

      for (const u of roleUsers) {
        const cleanEmail = u.email.trim().toLowerCase();
        if (!existingEmailSet.has(cleanEmail)) {
          const isGymOnly =
            u.userRoles.some((ur) => ur.role.code === 'GYM_TRAINER') &&
            !u.userRoles.some((ur) => ur.role.code === 'STUDIO_INSTRUCTOR');
          await this.prisma.instructor.create({
            data: {
              organizationId,
              branchId: u.branchId || branchId || null,
              firstName: u.firstName,
              lastName: u.lastName || '',
              identification: u.phoneNumber || cleanEmail.split('@')[0],
              phoneNumber: u.phoneNumber || null,
              email: cleanEmail,
              businessType: isGymOnly ? 'GYM' : 'STUDIO',
              paymentModel: InstructorPaymentModel.FIXED_PER_CLASS,
              fixedClassRate: 0,
              perStudentRate: 0,
              isActive: true,
            },
          });
          existingEmailSet.add(cleanEmail);
        }
      }
    }

    const instructors = await this.prisma.instructor.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
        ...(businessType
          ? {
              OR: [{ businessType }, { businessType: 'ALL' }],
            }
          : {}),
      },
      orderBy: [{ isActive: 'desc' }, { firstName: 'asc' }],
    });

    const emails = instructors
      .map((i) => i.email?.trim().toLowerCase())
      .filter((e): e is string => Boolean(e));

    const existingUsers = emails.length
      ? await this.prisma.user.findMany({
          where: {
            organizationId,
            email: { in: emails, mode: 'insensitive' },
            isActive: true,
          },
          select: { id: true, email: true },
        })
      : [];

    const userByEmail = new Map(
      existingUsers.map((u) => [u.email.trim().toLowerCase(), u]),
    );

    return instructors.map((inst) => {
      const matchedUser = inst.email
        ? userByEmail.get(inst.email.trim().toLowerCase())
        : undefined;
      return {
        ...inst,
        hasSystemAccess: Boolean(matchedUser),
        systemUserId: matchedUser?.id || null,
      };
    });
  }

  async findOne(id: string, organizationId: string) {
    const instructor = await this.prisma.instructor.findFirst({ where: { id, organizationId } });
    if (!instructor) throw new NotFoundException('Instructor no encontrado');
    return instructor;
  }

  private async ensureInstructorUserAccount(
    instructor: {
      id: string;
      organizationId: string;
      branchId: string | null;
      firstName: string;
      lastName: string | null;
      identification: string;
      phoneNumber: string | null;
      email: string | null;
      businessType?: string | null;
    },
    passwordOverride?: string,
  ) {
    const cleanEmail = instructor.email?.trim().toLowerCase();
    if (!cleanEmail) {
      throw new BadRequestException('El instructor debe tener un correo electrónico para habilitar su usuario');
    }

    let targetBranchId = instructor.branchId;
    if (!targetBranchId) {
      const firstBranch = await this.prisma.branch.findFirst({
        where: { organizationId: instructor.organizationId, isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!firstBranch) {
        throw new BadRequestException('La organización no tiene una sede activa para asociar el usuario del instructor');
      }
      targetBranchId = firstBranch.id;
    }

    const rawPassword = (passwordOverride || instructor.identification || '123456').trim();
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    let user = await this.prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          organizationId: instructor.organizationId,
          branchId: targetBranchId,
          firstName: instructor.firstName,
          lastName: instructor.lastName || '',
          email: cleanEmail,
          passwordHash,
          phoneNumber: instructor.phoneNumber || null,
          isActive: true,
        },
      });
    } else if (user.organizationId === instructor.organizationId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isActive: true,
          passwordHash,
        },
      });
    }

    const bType = instructor.businessType || 'STUDIO';
    const roleCodes: string[] = [];
    if (bType === 'STUDIO' || bType === 'ALL') roleCodes.push('STUDIO_INSTRUCTOR');
    if (bType === 'GYM' || bType === 'ALL') roleCodes.push('GYM_TRAINER');

    const roles = await this.prisma.role.findMany({
      where: { code: { in: roleCodes }, isActive: true },
    });

    for (const role of roles) {
      await this.prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    return {
      userId: user.id,
      email: user.email,
      initialPassword: rawPassword,
      assignedRoles: roles.map((r) => r.code),
    };
  }

  async create(dto: CreateInstructorDto) {
    const { createUserAccount, password, ...instructorData } = dto;
    if (instructorData.email) {
      instructorData.email = instructorData.email.trim().toLowerCase();
    }

    const instructor = await this.prisma.instructor.create({
      data: instructorData,
    });

    let accessInfo: any = null;
    if (createUserAccount !== false && instructor.email) {
      accessInfo = await this.ensureInstructorUserAccount(instructor, password);
    }

    return {
      ...instructor,
      hasSystemAccess: Boolean(accessInfo),
      accessInfo,
    };
  }

  async enableAccess(
    id: string,
    organizationId: string,
    body?: { email?: string; password?: string },
  ) {
    let instructor = await this.findOne(id, organizationId);
    if (body?.email && body.email.trim().toLowerCase() !== instructor.email) {
      instructor = await this.prisma.instructor.update({
        where: { id },
        data: { email: body.email.trim().toLowerCase() },
      });
    }
    const accessInfo = await this.ensureInstructorUserAccount(instructor, body?.password);
    return {
      ...instructor,
      hasSystemAccess: true,
      accessInfo,
    };
  }

  async update(id: string, organizationId: string, dto: UpdateInstructorDto) {
    await this.findOne(id, organizationId);
    const { createUserAccount, password, ...instructorData } = dto;
    const updated = await this.prisma.instructor.update({ where: { id }, data: instructorData });
    if (createUserAccount && updated.email) {
      await this.ensureInstructorUserAccount(updated, password);
    }
    return updated;
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
