import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateGymSubscriptionDto } from './dto/create-gym-subscription.dto';
import { UpdateGymSubscriptionDto } from './dto/update-gym-subscription.dto';

@Injectable()
export class GymSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGymSubscriptionDto) {
    const plan = await this.prisma.gymMembershipPlan.findUnique({
      where: { id: dto.membershipPlanId },
      include: { product: true },
    });

    if (!plan) throw new NotFoundException('Membership plan not found');

    // Asegurar que el plan tenga producto vinculado en el catálogo POS
    let productId = plan.productId;
    if (!productId) {
      let category = await this.prisma.productCategory.findFirst({
        where: { organizationId: dto.organizationId, name: 'Membresías' },
      });
      if (!category) {
        category = await this.prisma.productCategory.create({
          data: {
            organizationId: dto.organizationId,
            name: 'Membresías',
            description: 'Categoría generada automáticamente para servicios de gimnasio',
            trackStock: false,
          },
        });
      }
      const product = await this.prisma.product.create({
        data: {
          organizationId: dto.organizationId,
          categoryId: category.id,
          sku: `MEMB-${Date.now()}`,
          name: plan.name,
          description: plan.description,
          salePrice: plan.price,
          costPrice: 0,
          stock: 0,
        },
      });
      await this.prisma.gymMembershipPlan.update({
        where: { id: plan.id },
        data: { productId: product.id },
      });
      productId = product.id;
    }

    const start = new Date(dto.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + plan.durationDays);

    const planPrice = Number(plan.price || 0);
    const totalAmount =
      dto.totalAmount !== undefined && dto.totalAmount !== null
        ? Math.max(0, Number(dto.totalAmount))
        : planPrice;

    let paymentStatus = dto.paymentStatus || 'PAID';
    let paidAmount = totalAmount;

    if (paymentStatus === 'PENDING') {
      paidAmount = 0;
    } else if (paymentStatus === 'PARTIAL') {
      paidAmount = Math.max(0, Math.min(totalAmount, Number(dto.paidAmount || 0)));
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

    // Acumular puntos de fidelidad (1 pto por cada $1.000 COP pagados)
    if (paidAmount >= 1000) {
      const earnedPoints = Math.floor(paidAmount / 1000);
      if (earnedPoints > 0) {
        await this.prisma.customer.update({
          where: { id: dto.customerId },
          data: { loyaltyPoints: { increment: earnedPoints } },
        });
      }
    }

    return this.prisma.gymSubscription.create({
      data: {
        organizationId: dto.organizationId,
        branchId: dto.branchId,
        customerId: dto.customerId,
        membershipPlanId: dto.membershipPlanId,
        startDate: start,
        endDate: end,
        status: dto.status || 'ACTIVE',
        totalAmount,
        paidAmount,
        balanceAmount,
        paymentStatus,
        paymentNotes: dto.paymentNotes?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      include: {
        customer: true,
        plan: {
          include: { product: true },
        },
      },
    });
  }

  async findAll(organizationId: string, branchId?: string) {
    const subs = await this.prisma.gymSubscription.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        customer: true,
        plan: {
          include: { product: true },
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
      };
    });
  }

  async findOne(id: string) {
    const subscription = await this.prisma.gymSubscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: {
          include: { product: true },
        },
      },
    });
    if (!subscription) throw new NotFoundException(`Subscription with ID ${id} not found`);
    return subscription;
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

    if (amount >= 1000 && sub.customerId) {
      const earnedPoints = Math.floor(amount / 1000);
      if (earnedPoints > 0) {
        await this.prisma.customer.update({
          where: { id: sub.customerId },
          data: { loyaltyPoints: { increment: earnedPoints } },
        });
      }
    }

    return this.prisma.gymSubscription.update({
      where: { id },
      data: {
        totalAmount,
        paidAmount: newPaid,
        balanceAmount: newBalance,
        paymentStatus: newPaymentStatus,
        paymentNotes: updatedNotes,
      },
      include: {
        customer: true,
        plan: { include: { product: true } },
      },
    });
  }

  async freeze(id: string, reason?: string) {
    const sub = await this.findOne(id);
    if (sub.status === 'PAUSED') {
      throw new BadRequestException('La membresía ya se encuentra congelada');
    }
    if (sub.status !== 'ACTIVE') {
      throw new BadRequestException('Solo se pueden congelar membresías activas');
    }

    return this.prisma.gymSubscription.update({
      where: { id },
      data: {
        status: 'PAUSED',
        frozenAt: new Date(),
        freezeReason: reason?.trim() || 'Congelamiento solicitado por el socio',
      },
      include: {
        customer: true,
        plan: { include: { product: true } },
      },
    });
  }

  async unfreeze(id: string) {
    const sub = await this.findOne(id);
    if (sub.status !== 'PAUSED') {
      throw new BadRequestException('La membresía no está congelada');
    }

    const now = new Date();
    const frozenSince = sub.frozenAt ? new Date(sub.frozenAt) : now;
    const diffMs = Math.max(0, now.getTime() - frozenSince.getTime());
    const pausedDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const newEndDate = new Date(sub.endDate);
    newEndDate.setDate(newEndDate.getDate() + pausedDays);

    return this.prisma.gymSubscription.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        endDate: newEndDate,
        frozenAt: null,
        extendedDays: Number(sub.extendedDays || 0) + pausedDays,
      },
      include: {
        customer: true,
        plan: { include: { product: true } },
      },
    });
  }

  async extendValidity(id: string, days: number, reason?: string) {
    const sub = await this.findOne(id);
    const extraDays = Number(days || 0);
    if (!Number.isFinite(extraDays) || extraDays <= 0) {
      throw new BadRequestException('Ingresa una cantidad de días mayor a 0');
    }

    const newEndDate = new Date(sub.endDate);
    newEndDate.setDate(newEndDate.getDate() + extraDays);

    const stamp = new Date().toLocaleDateString('es-CO');
    const extNote = `[${stamp}] +${extraDays} días (${reason?.trim() || 'Extensión administrativa'})`;

    return this.prisma.gymSubscription.update({
      where: { id },
      data: {
        endDate: newEndDate,
        status: sub.status === 'EXPIRED' ? 'ACTIVE' : sub.status,
        extendedDays: Number(sub.extendedDays || 0) + extraDays,
        notes: [sub.notes, extNote].filter(Boolean).join(' | '),
      },
      include: {
        customer: true,
        plan: { include: { product: true } },
      },
    });
  }

  async updateCustomerMedicalAlerts(customerId: string, medicalAlerts?: string) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: {
        medicalAlerts: medicalAlerts?.trim() || null,
      },
    });
  }

  async update(id: string, dto: UpdateGymSubscriptionDto) {
    await this.findOne(id);
    return this.prisma.gymSubscription.update({
      where: { id },
      data: dto,
      include: {
        customer: true,
        plan: {
          include: { product: true },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.gymSubscription.delete({
      where: { id },
    });
  }
}
