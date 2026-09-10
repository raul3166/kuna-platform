import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissionsAny } from '../auth/decorators/permissions.decorator';
import { GymSchedulesService } from './gym-schedules.service';
import { CreateGymScheduleDto, UpdateGymScheduleDto, CreateGymShiftOverrideDto } from './dto/gym-schedule.dto';

@Controller('gym-schedules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GymSchedulesController {
  constructor(private readonly service: GymSchedulesService) {}

  @Get()
  @PermissionsAny('gym.read')
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.service.findAll(organizationId, branchId);
  }

  @Get('settlement/report')
  @PermissionsAny('gym.read')
  settlement(
    @Query('organizationId') organizationId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('instructorId') instructorId?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.service.settlement(organizationId, startDate, endDate, instructorId, branchId);
  }

  @Get(':id')
  @PermissionsAny('gym.read')
  findOne(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.service.findOne(id, organizationId);
  }

  @Post()
  @PermissionsAny('gym.create')
  create(@Body() dto: CreateGymScheduleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @PermissionsAny('gym.update')
  update(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() dto: UpdateGymScheduleDto,
  ) {
    return this.service.update(id, organizationId, dto);
  }

  @Delete(':id')
  @PermissionsAny('gym.delete')
  remove(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.service.remove(id, organizationId);
  }

  @Post('overrides')
  @PermissionsAny('gym.update')
  setOverride(@Body() dto: CreateGymShiftOverrideDto) {
    return this.service.setOverride(dto);
  }
}

