import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateGymSubscriptionDto } from './dto/create-gym-subscription.dto';
import { UpdateGymSubscriptionDto } from './dto/update-gym-subscription.dto';

@Injectable()
export class GymSubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGymSubscriptionDto) {
    // Buscar el plan para calcular la fecha de fin automáticamente basada en durationDays
    const plan = await this.prisma.gymMembershipPlan.findUnique({
      where: { id: dto.membershipPlanId },
    });

    if (!plan) throw new NotFoundException('Membership plan not found');

    const start = new Date(dto.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + plan.durationDays);

    return this.prisma.gymSubscription.create({
      data: {
        organizationId: dto.organizationId,
        branchId: dto.branchId,
        customerId: dto.customerId,
        membershipPlanId: dto.membershipPlanId,
        startDate: start,
        endDate: end,
        status: dto.status || 'ACTIVE',
        paymentStatus: dto.paymentStatus || 'PAID',
      },
      include: {
        customer: true,
        plan: true,
      },
    });
  }

  async findAll(organizationId: string, branchId?: string) {
    return this.prisma.gymSubscription.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        customer: true,
        plan: true,
      },
    });
  }

  async findOne(id: string) {
    const subscription = await this.prisma.gymSubscription.findUnique({
      where: { id },
      include: { customer: true, plan: true },
    });
    if (!subscription) throw new NotFoundException(`Subscription with ID ${id} not found`);
    return subscription;
  }

  async update(id: string, dto: UpdateGymSubscriptionDto) {
    await this.findOne(id);
    return this.prisma.gymSubscription.update({
      where: { id },
      data: dto,
      include: { customer: true, plan: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.gymSubscription.delete({
      where: { id },
    });
  }
}
