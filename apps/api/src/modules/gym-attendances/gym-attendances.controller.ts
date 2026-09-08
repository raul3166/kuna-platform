import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GymAttendancesService } from './gym-attendances.service';
import { CreateGymAttendanceDto } from './dto/create-gym-attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Gym Attendances')
@ApiBearerAuth('JWT-auth')
@Controller('gym-attendances')
export class GymAttendancesController {
  constructor(private readonly attendancesService: GymAttendancesService) {}

  @ApiOperation({ summary: 'Register a member check-in (validation)' })
  @Permissions('gym.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('check-in')
  checkIn(@Body() dto: CreateGymAttendanceDto) {
    return this.attendancesService.checkIn(dto);
  }

  @ApiOperation({ summary: 'Get attendance logs' })
  @Permissions('gym.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.attendancesService.findAll(organizationId, branchId);
  }
}
