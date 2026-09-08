import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GymSubscriptionsService } from './gym-subscriptions.service';
import { CreateGymSubscriptionDto } from './dto/create-gym-subscription.dto';
import { UpdateGymSubscriptionDto } from './dto/update-gym-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Gym Subscriptions')
@ApiBearerAuth('JWT-auth')
@Controller('gym-subscriptions')
export class GymSubscriptionsController {
  constructor(private readonly subscriptionsService: GymSubscriptionsService) {}

  @ApiOperation({ summary: 'Create a new client subscription' })
  @Permissions('gym.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() dto: CreateGymSubscriptionDto) {
    return this.subscriptionsService.create(dto);
  }

  @ApiOperation({ summary: 'Get all subscriptions' })
  @Permissions('gym.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.subscriptionsService.findAll(organizationId, branchId);
  }

  @ApiOperation({ summary: 'Get a single subscription by id' })
  @Permissions('gym.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a subscription' })
  @Permissions('gym.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGymSubscriptionDto) {
    return this.subscriptionsService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a subscription' })
  @Permissions('gym.delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.subscriptionsService.remove(id);
  }
}
