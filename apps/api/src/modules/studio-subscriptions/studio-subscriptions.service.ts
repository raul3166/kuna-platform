import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateStudioSubscriptionDto } from './dto/create-studio-subscription.dto';
import { StudioPlanType } from '../studio-plans/dto/create-studio-plan.dto';

@Injectable()
export class StudioSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudioSubscriptionDto) {
    if (!dto.branchId) {
      throw new BadRequestException('Se requiere una sucursal (branchId) para crear la suscripción');
    }

    const plan = await this.prisma.studioPlan.findUnique({
      where: { id: dto.studioPlanId },
      include: { product: true },
    });

    if (!plan) {
      throw new NotFoundException('El plan de estudio no existe');
    }

    // Asegurar que el plan tenga un producto vinculado para facturación en POS
    let productId = plan.productId;
    if (!productId) {
      let category = await this.prisma.productCategory.findFirst({
        where: { organizationId: dto.organizationId, name: 'Clases de Estudio' },
      });
      if (!category) {
        category = await this.prisma.productCategory.create({
          data: {
            organizationId: dto.organizationId,
            name: 'Clases de Estudio',
            description: 'Categoría para paquetes y tiqueteras de Yoga, Pilates y Barre',
            trackStock: false,
          },
        });
      }
      const product = await this.prisma.product.create({
        data: {
          organizationId: dto.organizationId,
          categoryId: category.id,
          sku: `STUDIO-${Date.now()}`,
          name: plan.name,
          description: plan.description,
          salePrice: plan.price,
          costPrice: 0,
          stock: 0,
        },
      });
      await this.prisma.studioPlan.update({
        where: { id: plan.id },
        data: { productId: product.id },
      });
      productId = product.id;
    }

    // Validación si el plan es exclusivo para alumnos nuevos
    if (plan.isNewStudentOnly) {
      const existingSubs = await this.prisma.studioSubscription.count({
        where: { customerId: dto.customerId },
      });
      if (existingSubs > 0) {
        throw new BadRequestException('Este plan solo está disponible para alumnos nuevos');
      }
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const isPack = plan.type === StudioPlanType.CLASS_PACK;
    const totalAmount = Number(plan.price) || 0;

    let paymentStatus = dto.paymentStatus || 'PAID';
    let paidAmount = totalAmount;

    if (paymentStatus === 'PENDING') {
      paidAmount = 0;
    } else if (paymentStatus === 'PARTIAL') {
      paidAmount = Math.max(0, Math.min(totalAmount, Number(dto.paidAmount) || 0));
      if (paidAmount >= totalAmount && totalAmount > 0) {
        paymentStatus = 'PAID';
      } else if (paidAmount <= 0) {
        paymentStatus = 'PENDING';
      }
    } else if (dto.paidAmount !== undefined && dto.paidAmount !== null) {
      paidAmount = Math.max(0, Math.min(totalAmount, Number(dto.paidAmount)));
      if (paidAmount <= 0 && totalAmount > 0) {
        paymentStatus = 'PENDING';
      } else if (paidAmount < totalAmount) {
        paymentStatus = 'PARTIAL';
      } else {
        paymentStatus = 'PAID';
      }
    }

    const balanceAmount = Math.max(0, totalAmount - paidAmount);

    if (dto.medicalAlerts !== undefined) {
      await this.prisma.customer.update({
        where: { id: dto.customerId },
        data: { medicalAlerts: dto.medicalAlerts.trim() || null },
      });
    }

    return this.prisma.studioSubscription.create({
      data: {
        organizationId: dto.organizationId,
        branchId: dto.branchId,
        customerId: dto.customerId,
        studioPlanId: plan.id,
        startDate,
        endDate,
        totalClasses: isPack ? plan.totalClasses : null,
        remainingClasses: isPack ? plan.totalClasses : null,
        status: 'ACTIVE',
        totalAmount,
        paidAmount,
        balanceAmount,
        paymentStatus,
        paymentNotes: dto.paymentNotes?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      include: {
        plan: {
          include: { product: true },
        },
        customer: true,
      },
    });
  }

  async findAll(organizationId: string, branchId?: string, customerId?: string) {
    const subs = await this.prisma.studioSubscription.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
        ...(customerId ? { customerId } : {}),
      },
      include: {
        plan: {
          include: { product: true },
        },
        customer: true,
        _count: {
          select: {
            attendanceLogs: {
              where: { status: 'ALLOWED' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subs.map((s) => {
      const planPrice = Number(s.plan?.price || 0);
      const totalAmount = Number(s.totalAmount || 0) > 0 ? Number(s.totalAmount) : planPrice;
      const paidAmount =
        Number(s.totalAmount || 0) === 0 && s.paymentStatus === 'PAID'
          ? planPrice
          : Number(s.paidAmount || 0);
      const balanceAmount = Math.max(0, totalAmount - paidAmount);
      return {
        ...s,
        totalAmount,
        paidAmount,
        balanceAmount,
        attendedClassesCount: s._count?.attendanceLogs ?? 0,
        hasStartedFirstClass: (s._count?.attendanceLogs ?? 0) > 0,
      };
    });
  }

  async findOne(id: string) {
    const sub = await this.prisma.studioSubscription.findUnique({
      where: { id },
      include: {
        plan: {
          include: { product: true },
        },
        customer: true,
        attendanceLogs: {
          take: 10,
          orderBy: { checkInAt: 'desc' },
        },
      },
    });

    if (!sub) {
      throw new NotFoundException(`Suscripción con ID ${id} no encontrada`);
    }

    return sub;
  }

  async cancel(id: string) {
    await this.findOne(id);
    return this.prisma.studioSubscription.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async recordPayment(id: string, payload: { amount: number; notes?: string }) {
    const sub = await this.findOne(id);
    const amount = Number(payload.amount || 0);
    if (amount <= 0) {
      throw new BadRequestException('El monto del abono debe ser mayor a 0');
    }

    const planPrice = Number(sub.plan?.price || 0);
    const totalAmount = Number(sub.totalAmount || 0) > 0 ? Number(sub.totalAmount) : planPrice;
    const currentPaid = Number(sub.paidAmount || 0);
    const newPaid = Math.min(totalAmount, currentPaid + amount);
    const newBalance = Math.max(0, totalAmount - newPaid);
    const newPaymentStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL';

    const stamp = new Date().toLocaleDateString('es-CO');
    const logLine = `[${stamp}] Abono +$${amount.toLocaleString('es-CO')}${payload.notes ? ` (${payload.notes.trim()})` : ''}`;
    const updatedNotes = [sub.paymentNotes, logLine].filter(Boolean).join(' | ');

    return this.prisma.studioSubscription.update({
      where: { id },
      data: {
        totalAmount,
        paidAmount: newPaid,
        balanceAmount: newBalance,
        paymentStatus: newPaymentStatus,
        paymentNotes: updatedNotes,
      },
      include: {
        plan: true,
        customer: true,
      },
    });
  }

  async freeze(id: string, payload: { reason?: string }) {
    const sub = await this.findOne(id);
    if (sub.status === 'PAUSED') {
      throw new BadRequestException('El paquete ya se encuentra congelado/pausado');
    }
    return this.prisma.studioSubscription.update({
      where: { id },
      data: {
        status: 'PAUSED',
        frozenAt: new Date(),
        freezeReason: payload.reason?.trim() || 'Congelamiento solicitado por el alumno',
      },
      include: {
        plan: true,
        customer: true,
      },
    });
  }

  async unfreeze(id: string) {
    const sub = await this.findOne(id);
    if (sub.status !== 'PAUSED') {
      throw new BadRequestException('El paquete no está congelado actualmente');
    }

    const frozenAt = sub.frozenAt ? new Date(sub.frozenAt) : new Date();
    const diffMs = Math.max(0, Date.now() - frozenAt.getTime());
    const daysFrozen = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const newEndDate = new Date(sub.endDate);
    newEndDate.setDate(newEndDate.getDate() + daysFrozen);

    return this.prisma.studioSubscription.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        frozenAt: null,
        endDate: newEndDate,
        extendedDays: (sub.extendedDays || 0) + daysFrozen,
      },
      include: {
        plan: true,
        customer: true,
      },
    });
  }

  async extendValidity(id: string, payload: { extraDays: number; reason?: string }) {
    const sub = await this.findOne(id);
    const extraDays = Math.round(Number(payload.extraDays || 0));
    if (extraDays <= 0 || extraDays > 365) {
      throw new BadRequestException('Ingresa una cantidad válida de días a extender (1 a 365)');
    }

    const newEndDate = new Date(sub.endDate);
    newEndDate.setDate(newEndDate.getDate() + extraDays);

    const reasonText = payload.reason?.trim()
      ? `${payload.reason.trim()} (+${extraDays}d)`
      : `Extensión manual (+${extraDays}d)`;

    return this.prisma.studioSubscription.update({
      where: { id },
      data: {
        endDate: newEndDate,
        extendedDays: (sub.extendedDays || 0) + extraDays,
        freezeReason: [sub.freezeReason, reasonText].filter(Boolean).join(' | '),
        ...(sub.status === 'EXPIRED' ? { status: 'ACTIVE' } : {}),
      },
      include: {
        plan: true,
        customer: true,
      },
    });
  }

  async updateCustomerMedicalAlerts(
    customerId: string,
    payload: { medicalAlerts?: string; notes?: string },
  ) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundException('Alumno no encontrado');
    }

    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        ...(payload.medicalAlerts !== undefined
          ? { medicalAlerts: payload.medicalAlerts.trim() || null }
          : {}),
        ...(payload.notes !== undefined ? { notes: payload.notes.trim() || null } : {}),
      },
    });
  }

  async listPackageRequests(organizationId: string, status?: string) {
    return this.prisma.studioPackageRequest.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        customer: true,
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approvePackageRequest(requestId: string, branchId?: string) {
    const req = await this.prisma.studioPackageRequest.findUnique({
      where: { id: requestId },
      include: { plan: true, customer: true },
    });

    if (!req) {
      throw new NotFoundException('Solicitud de paquete no encontrada');
    }
    if (req.status === 'APPROVED') {
      throw new BadRequestException('Esta solicitud ya fue aprobada anteriormente');
    }

    let resolvedBranchId = branchId || req.branchId || '';
    if (!resolvedBranchId) {
      const defaultBranch = await this.prisma.branch.findFirst({
        where: { organizationId: req.organizationId, isActive: true },
      });
      resolvedBranchId = defaultBranch?.id || '';
    }

    const planPrice = Number(req.plan?.price || 0);
    const amountPaid = Number(req.amountPaid || 0);
    const paymentStatus =
      amountPaid >= planPrice && planPrice > 0
        ? 'PAID'
        : amountPaid > 0
          ? 'PARTIAL'
          : 'PENDING';

    const subscription = await this.create({
      organizationId: req.organizationId,
      branchId: resolvedBranchId,
      customerId: req.customerId,
      studioPlanId: req.studioPlanId,
      paymentStatus,
      paidAmount: amountPaid,
      paymentNotes: [
        `Portal (${req.paymentMethod})`,
        req.reference ? `Ref: ${req.reference}` : null,
        req.notes || null,
      ]
        .filter(Boolean)
        .join(' - '),
    });

    await this.prisma.studioPackageRequest.update({
      where: { id: requestId },
      data: { status: 'APPROVED' },
    });

    return subscription;
  }

  async rejectPackageRequest(requestId: string) {
    const req = await this.prisma.studioPackageRequest.findUnique({ where: { id: requestId } });
    if (!req) {
      throw new NotFoundException('Solicitud de paquete no encontrada');
    }
    return this.prisma.studioPackageRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
  }
}
