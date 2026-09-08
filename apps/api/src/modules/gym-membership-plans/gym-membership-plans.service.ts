import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateGymMembershipPlanDto } from './dto/create-gym-membership-plan.dto';
import { UpdateGymMembershipPlanDto } from './dto/update-gym-membership-plan.dto';

@Injectable()
export class GymMembershipPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGymMembershipPlanDto) {
    return this.prisma.gymMembershipPlan.create({
      data: dto,
    });
  }

  async findAll(organizationId: string, branchId?: string) {
    return this.prisma.gymMembershipPlan.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
      },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.gymMembershipPlan.findUnique({
      where: { id },
    });
    if (!plan) throw new NotFoundException(`Membership plan with ID ${id} not found`);
    return plan;
  }

  async update(id: string, dto: UpdateGymMembershipPlanDto) {
    await this.findOne(id);
    return this.prisma.gymMembershipPlan.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.gymMembershipPlan.delete({
      where: { id },
    });
  }
}
