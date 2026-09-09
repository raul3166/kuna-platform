import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StudioAttendancesService } from './studio-attendances.service';
import { CreateStudioAttendanceDto } from './dto/create-studio-attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Studio Attendances')
@ApiBearerAuth('JWT-auth')
@Controller('studio-attendances')
export class StudioAttendancesController {
  constructor(private readonly attendancesService: StudioAttendancesService) {}

  @ApiOperation({ summary: 'Register a studio member check-in (validation & class decrement)' })
  @Permissions('studio.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('check-in')
  checkIn(@Body() dto: CreateStudioAttendanceDto) {
    return this.attendancesService.checkIn(dto);
  }

  @ApiOperation({ summary: 'Get studio attendance logs' })
  @Permissions('studio.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
    @Query('studioScheduleId') studioScheduleId?: string,
    @Query('date') date?: string,
  ) {
    return this.attendancesService.findAll(organizationId, branchId, studioScheduleId, date);
  }
}
