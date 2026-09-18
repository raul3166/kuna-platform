import { Injectable, NotFoundException } from '@nestjs/common';
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
        plan: {
          include: { product: true },
        },
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
        plan: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
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
