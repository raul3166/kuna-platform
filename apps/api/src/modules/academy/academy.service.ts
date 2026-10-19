import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  BatchRecordAttendanceDto,
  CreateAcademyCohortDto,
  CreateAcademyCourseDto,
  CreateAcademyEnrollmentDto,
  UpdateAcademyConfigDto,
  UpdateAcademyEnrollmentDto,
} from './dto/academy.dto';
import {
  AcademyAttendanceStatus,
  AcademyEnrollmentStatus,
  Prisma,
  ServiceOrderStatus,
} from '@prisma/client';

@Injectable()
export class AcademyService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveOrganizationId(
    organizationId?: string,
    userId?: string,
  ): Promise<string> {
    if (organizationId && organizationId.trim() !== '') {
      return organizationId;
    }

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (user?.organizationId) {
        return user.organizationId;
      }
    }

    const fallbackOrg = await this.prisma.organization.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!fallbackOrg) {
      throw new BadRequestException(
        'No se encontró una organización activa para operar el módulo de Academia.',
      );
    }

    return fallbackOrg.id;
  }

  private async resolveBranchId(
    organizationId: string,
    branchId?: string,
  ): Promise<string> {
    if (branchId && branchId.trim() !== '') {
      return branchId;
    }

    const branch = await this.prisma.branch.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!branch) {
      throw new BadRequestException(
        'No se encontró una sede/sucursal activa para operar la Academia.',
      );
    }

    return branch.id;
  }

  async getDashboard(
    organizationId?: string,
    branchId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const branchFilter = branchId ? { branchId } : {};

    const [
      activeCoursesCount,
      activeCohorts,
      activeEnrollments,
      recentEnrollments,
    ] = await Promise.all([
      this.prisma.academyCourse.count({
        where: { organizationId: orgId, isActive: true },
      }),
      this.prisma.academyCohort.findMany({
        where: {
          organizationId: orgId,
          ...branchFilter,
          isActive: true,
        },
        include: {
          course: true,
          teacherWorker: true,
          branch: true,
          _count: {
            select: { enrollments: true },
          },
        },
        orderBy: { startDate: 'asc' },
      }),
      this.prisma.academyEnrollment.findMany({
        where: {
          organizationId: orgId,
          ...branchFilter,
          status: AcademyEnrollmentStatus.ACTIVE,
        },
        include: {
          serviceOrder: true,
        },
      }),
      this.prisma.academyEnrollment.findMany({
        where: {
          organizationId: orgId,
          ...branchFilter,
        },
        include: {
          studentCustomer: true,
          cohort: {
            include: {
              course: true,
              teacherWorker: true,
            },
          },
          serviceOrder: true,
        },
        orderBy: { enrolledAt: 'desc' },
        take: 12,
      }),
    ]);

    const averageAttendancePct =
      activeEnrollments.length > 0
        ? Math.round(
            activeEnrollments.reduce(
              (sum, e) => sum + Number(e.attendancePct ?? 100),
              0,
            ) / activeEnrollments.length,
          )
        : 100;

    const pendingBillingEnrollmentsCount = activeEnrollments.filter(
      (e) => e.serviceOrder && !e.serviceOrder.saleId,
    ).length;

    const expectedTuitionRevenue = activeEnrollments.reduce(
      (sum, e) => sum + Number(e.agreedTotalAmount ?? 0),
      0,
    );

    return {
      kpis: {
        activeCoursesCount,
        activeCohortsCount: activeCohorts.length,
        activeEnrollmentsCount: activeEnrollments.length,
        averageAttendancePct,
        pendingBillingEnrollmentsCount,
        expectedTuitionRevenue,
      },
      activeCohorts,
      recentEnrollments,
    };
  }

  async findAllCourses(
    organizationId?: string,
    search?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const where: Prisma.AcademyCourseWhereInput = {
      organizationId: orgId,
    };

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.academyCourse.findMany({
      where,
      include: {
        serviceItem: true,
        _count: {
          select: { cohorts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createCourse(dto: CreateAcademyCourseDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const code =
      dto.code?.trim() ||
      `CUR-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.academyCourse.create({
      data: {
        organizationId: orgId,
        code,
        name: dto.name.trim(),
        category: dto.category || 'IDIOMAS',
        level: dto.level || 'BASICO',
        durationWeeks: dto.durationWeeks ?? 12,
        totalHours: dto.totalHours ?? 48,
        tuitionFee: dto.tuitionFee ?? 0,
        monthlyFee: dto.monthlyFee ?? 0,
        serviceItemId: dto.serviceItemId || null,
        description: dto.description,
      },
      include: {
        serviceItem: true,
        _count: {
          select: { cohorts: true },
        },
      },
    });
  }

  async findAllCohorts(
    organizationId?: string,
    branchId?: string,
    courseId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    return this.prisma.academyCohort.findMany({
      where: {
        organizationId: orgId,
        ...(branchId ? { branchId } : {}),
        ...(courseId ? { courseId } : {}),
      },
      include: {
        course: true,
        teacherWorker: true,
        branch: true,
        _count: {
          select: { enrollments: true, attendances: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findCohortById(id: string, organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const cohort = await this.prisma.academyCohort.findFirst({
      where: { id, organizationId: orgId },
      include: {
        course: true,
        teacherWorker: true,
        branch: true,
        enrollments: {
          include: {
            studentCustomer: true,
            serviceOrder: true,
            attendances: {
              orderBy: { sessionDate: 'desc' },
              take: 10,
            },
          },
          orderBy: { enrolledAt: 'asc' },
        },
        attendances: {
          orderBy: { sessionDate: 'desc' },
          take: 30,
        },
      },
    });

    if (!cohort) {
      throw new NotFoundException('Grupo o cohorte académica no encontrada.');
    }

    return cohort;
  }

  async createCohort(dto: CreateAcademyCohortDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);
    const branchId = await this.resolveBranchId(orgId, dto.branchId);

    const course = await this.prisma.academyCourse.findFirst({
      where: { id: dto.courseId, organizationId: orgId },
    });

    if (!course) {
      throw new NotFoundException('El programa o curso seleccionado no existe.');
    }

    const code =
      dto.code?.trim() ||
      `GRP-${Date.now().toString().slice(-6)}`;

    return this.prisma.academyCohort.create({
      data: {
        organizationId: orgId,
        branchId,
        courseId: course.id,
        teacherWorkerId: dto.teacherWorkerId || null,
        code,
        name: dto.name.trim(),
        classroom: dto.classroom || 'Aula Principal',
        scheduleLabel: dto.scheduleLabel.trim(),
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        maxCapacity: dto.maxCapacity ?? 20,
      },
      include: {
        course: true,
        teacherWorker: true,
        branch: true,
      },
    });
  }

  async findAllEnrollments(
    organizationId?: string,
    branchId?: string,
    cohortId?: string,
    status?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    return this.prisma.academyEnrollment.findMany({
      where: {
        organizationId: orgId,
        ...(branchId ? { branchId } : {}),
        ...(cohortId ? { cohortId } : {}),
        ...(status ? { status: status as AcademyEnrollmentStatus } : {}),
      },
      include: {
        studentCustomer: true,
        cohort: {
          include: {
            course: true,
            teacherWorker: true,
          },
        },
        serviceOrder: true,
        _count: {
          select: { attendances: true },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async createEnrollment(dto: CreateAcademyEnrollmentDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const cohort = await this.prisma.academyCohort.findFirst({
      where: { id: dto.cohortId, organizationId: orgId },
      include: {
        course: true,
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!cohort) {
      throw new NotFoundException('El grupo o cohorte seleccionado no existe.');
    }

    const branchId = await this.resolveBranchId(
      orgId,
      dto.branchId || cohort.branchId,
    );

    const student = await this.prisma.customer.findFirst({
      where: { id: dto.studentCustomerId, organizationId: orgId },
    });

    if (!student) {
      throw new NotFoundException(
        'El estudiante seleccionado no existe en el directorio de clientes.',
      );
    }

    const existingEnrollment = await this.prisma.academyEnrollment.findFirst({
      where: {
        cohortId: cohort.id,
        studentCustomerId: student.id,
        status: {
          in: [
            AcademyEnrollmentStatus.ACTIVE,
            AcademyEnrollmentStatus.PAUSED,
          ],
        },
      },
    });

    if (existingEnrollment) {
      throw new BadRequestException(
        'El estudiante ya cuenta con una matrícula activa en este grupo.',
      );
    }

    const activeCount = await this.prisma.academyEnrollment.count({
      where: {
        cohortId: cohort.id,
        status: AcademyEnrollmentStatus.ACTIVE,
      },
    });

    if (activeCount >= cohort.maxCapacity) {
      throw new BadRequestException(
        `El grupo ${cohort.name} ha alcanzado su cupo máximo (${cohort.maxCapacity} estudiantes).`,
      );
    }

    const scholarshipPct = Math.min(
      100,
      Math.max(0, Number(dto.scholarshipPct ?? 0)),
    );
    const baseCoursePrice =
      Number(cohort.course.tuitionFee ?? 0) +
      Number(cohort.course.monthlyFee ?? 0);
    const discountedCoursePrice = Math.round(
      baseCoursePrice * (1 - scholarshipPct / 100),
    );

    // Optional educational materials (books, kits, uniforms from Product catalog)
    let materialsTotal = 0;
    const materialItemsToCreate: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      unitCost: number;
      total: number;
    }> = [];

    if (dto.materials && dto.materials.length > 0) {
      const prodIds = dto.materials.map((m) => m.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: prodIds }, organizationId: orgId },
      });
      const prodMap = new Map(products.map((p) => [p.id, p]));

      for (const m of dto.materials) {
        const prod = prodMap.get(m.productId);
        if (!prod) continue;
        const qty = Number(m.quantity || 1);
        const unitPrice = Number(prod.salePrice ?? 0);
        const unitCost = Number(prod.costPrice ?? 0);
        const total = unitPrice * qty;
        materialsTotal += total;
        materialItemsToCreate.push({
          productId: prod.id,
          quantity: qty,
          unitPrice,
          unitCost,
          total,
        });
      }
    }

    const agreedTotalAmount = discountedCoursePrice + materialsTotal;
    const enrollmentNumber = `MAT-${Date.now().toString().slice(-6)}`;
    const shouldCreateOrder = dto.createServiceOrder ?? true;

    return this.prisma.$transaction(async (tx) => {
      let serviceOrderId: string | null = null;

      if (shouldCreateOrder) {
        const orderNumber = `ORD-ACA-${Date.now().toString().slice(-6)}`;
        const createdOrder = await tx.serviceOrder.create({
          data: {
            organizationId: orgId,
            branchId,
            orderNumber,
            customerId: student.id,
            assignedWorkerId: cohort.teacherWorkerId || null,
            assetName: `Matrícula: ${cohort.course.name}`,
            assetIdentifier: `${cohort.code} / ${enrollmentNumber}`,
            initialNotes: `Grupo: ${cohort.name} (${cohort.scheduleLabel}) - Beca: ${scholarshipPct}%`,
            status: ServiceOrderStatus.COMPLETED,
            laborTotal: discountedCoursePrice,
            materialsTotal,
            total: agreedTotalAmount,
            serviceItemId: cohort.course.serviceItemId || null,
            tasks: {
              create: [
                {
                  serviceItemId: cohort.course.serviceItemId || null,
                  assignedWorkerId: cohort.teacherWorkerId || null,
                  description: `Matrícula y Colegiatura: ${cohort.course.name} (${cohort.name})`,
                  price: discountedCoursePrice,
                  isCompleted: true,
                },
              ],
            },
            ...(materialItemsToCreate.length > 0
              ? {
                  materials: {
                    create: materialItemsToCreate,
                  },
                }
              : {}),
          },
        });
        serviceOrderId = createdOrder.id;
      }

      return tx.academyEnrollment.create({
        data: {
          organizationId: orgId,
          branchId,
          cohortId: cohort.id,
          studentCustomerId: student.id,
          serviceOrderId,
          enrollmentNumber,
          status: AcademyEnrollmentStatus.ACTIVE,
          scholarshipPct,
          agreedTotalAmount,
          guardianName: dto.guardianName,
          guardianPhone: dto.guardianPhone,
          notes: dto.notes,
        },
        include: {
          studentCustomer: true,
          cohort: {
            include: {
              course: true,
              teacherWorker: true,
            },
          },
          serviceOrder: true,
        },
      });
    });
  }

  async updateEnrollment(
    id: string,
    dto: UpdateAcademyEnrollmentDto,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const enrollment = await this.prisma.academyEnrollment.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!enrollment) {
      throw new NotFoundException('Matrícula no encontrada.');
    }

    return this.prisma.academyEnrollment.update({
      where: { id: enrollment.id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.finalGrade !== undefined ? { finalGrade: dto.finalGrade } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      include: {
        studentCustomer: true,
        cohort: {
          include: {
            course: true,
            teacherWorker: true,
          },
        },
        serviceOrder: true,
      },
    });
  }

  async recordCohortAttendance(dto: BatchRecordAttendanceDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const cohort = await this.prisma.academyCohort.findFirst({
      where: { id: dto.cohortId, organizationId: orgId },
    });

    if (!cohort) {
      throw new NotFoundException('Grupo académico no encontrado.');
    }

    const sessionDate = dto.sessionDate ? new Date(dto.sessionDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const createdRecords: any[] = [];

      for (const item of dto.records) {
        const rec = await tx.academyAttendance.create({
          data: {
            organizationId: orgId,
            cohortId: cohort.id,
            enrollmentId: item.enrollmentId,
            sessionDate,
            topic: dto.topic || 'Sesión Académica Regular',
            status: item.status,
            gradeScore: item.gradeScore,
            notes: item.notes,
          },
        });
        createdRecords.push(rec);

        // Recalculate student attendance % and average grade
        const allStudentAttendances = await tx.academyAttendance.findMany({
          where: { enrollmentId: item.enrollmentId },
        });

        if (allStudentAttendances.length > 0) {
          const attendedCount = allStudentAttendances.filter(
            (a) =>
              a.status === AcademyAttendanceStatus.PRESENT ||
              a.status === AcademyAttendanceStatus.LATE ||
              a.status === AcademyAttendanceStatus.EXCUSED,
          ).length;

          const attendancePct =
            (attendedCount / allStudentAttendances.length) * 100;

          const gradedSessions = allStudentAttendances.filter(
            (a) => a.gradeScore !== null && a.gradeScore !== undefined,
          );

          const avgGrade =
            gradedSessions.length > 0
              ? gradedSessions.reduce(
                  (sum, a) => sum + Number(a.gradeScore),
                  0,
                ) / gradedSessions.length
              : undefined;

          await tx.academyEnrollment.update({
            where: { id: item.enrollmentId },
            data: {
              attendancePct,
              ...(avgGrade !== undefined ? { finalGrade: avgGrade } : {}),
            },
          });
        }
      }

      return {
        cohortId: cohort.id,
        sessionDate,
        recordedCount: createdRecords.length,
      };
    });
  }

  async getConfig(organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'ACADEMY' },
    });

    if (!vertical) {
      throw new NotFoundException(
        'El vertical ACADEMY no está registrado en el catálogo maestro.',
      );
    }

    const orgVertical = await this.prisma.organizationVertical.findUnique({
      where: {
        organizationId_verticalId: {
          organizationId: orgId,
          verticalId: vertical.id,
        },
      },
    });

    const defaultConfig = {
      gradingScaleMax: 5.0,
      minPassingGrade: 3.0,
      minAttendancePct: 80,
      autoCreateServiceOrderOnEnrollment: true,
    };

    return {
      organizationId: orgId,
      verticalCode: 'ACADEMY',
      isActive: orgVertical?.isActive ?? false,
      config: {
        ...defaultConfig,
        ...((orgVertical?.config as Record<string, any>) || {}),
      },
    };
  }

  async updateConfig(dto: UpdateAcademyConfigDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'ACADEMY' },
    });

    if (!vertical) {
      throw new NotFoundException(
        'El vertical ACADEMY no está registrado en el catálogo maestro.',
      );
    }

    const current = await this.getConfig(orgId, userId);
    const { organizationId: _ignore, ...configUpdates } = dto;
    const mergedConfig = {
      ...current.config,
      ...configUpdates,
    };

    const updated = await this.prisma.organizationVertical.upsert({
      where: {
        organizationId_verticalId: {
          organizationId: orgId,
          verticalId: vertical.id,
        },
      },
      update: {
        config: mergedConfig,
      },
      create: {
        organizationId: orgId,
        verticalId: vertical.id,
        isActive: true,
        config: mergedConfig,
      },
    });

    return {
      organizationId: orgId,
      verticalCode: 'ACADEMY',
      isActive: updated.isActive,
      config: updated.config,
    };
  }
}
