import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GymMembershipPlansService } from './gym-membership-plans.service';
import { CreateGymMembershipPlanDto } from './dto/create-gym-membership-plan.dto';
import { UpdateGymMembershipPlanDto } from './dto/update-gym-membership-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Gym Membership Plans')
@ApiBearerAuth('JWT-auth')
@Controller('gym-membership-plans')
export class GymMembershipPlansController {
  constructor(private readonly plansService: GymMembershipPlansService) {}

  @ApiOperation({ summary: 'Create a new gym membership plan' })
  @Permissions('gym.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() dto: CreateGymMembershipPlanDto) {
    return this.plansService.create(dto);
  }

  @ApiOperation({ summary: 'Get all gym membership plans' })
  @Permissions('gym.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.plansService.findAll(organizationId, branchId);
  }

  @ApiOperation({ summary: 'Get a single gym membership plan by id' })
  @Permissions('gym.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a gym membership plan' })
  @Permissions('gym.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGymMembershipPlanDto) {
    return this.plansService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a gym membership plan' })
  @Permissions('gym.delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }
}
