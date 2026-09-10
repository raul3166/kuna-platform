import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { InstructorsService } from './instructors.service';
import { CreateInstructorDto, UpdateInstructorDto, CreateInstructorOverrideDto } from './dto/instructor.dto';

@Controller('instructors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InstructorsController {
  constructor(private readonly service: InstructorsService) {}
  @Get() @Permissions('studio.read') findAll(@Query('organizationId') organizationId: string, @Query('branchId') branchId?: string) { return this.service.findAll(organizationId, branchId); }
  @Post() @Permissions('studio.create') create(@Body() dto: CreateInstructorDto) { return this.service.create(dto); }
  @Patch(':id') @Permissions('studio.update') update(@Param('id') id: string, @Query('organizationId') organizationId: string, @Body() dto: UpdateInstructorDto) { return this.service.update(id, organizationId, dto); }
  @Delete(':id') @Permissions('studio.delete') remove(@Param('id') id: string, @Query('organizationId') organizationId: string) { return this.service.remove(id, organizationId); }
  @Post('overrides') @Permissions('studio.update') override(@Body() dto: CreateInstructorOverrideDto) { return this.service.setOverride(dto); }
  @Get('assignments/list') @Permissions('studio.read') assignments(@Query('organizationId') organizationId: string, @Query('branchId') branchId?: string) { return this.service.assignments(organizationId, branchId); }
  @Get('settlement/report') @Permissions('studio.read') report(@Query('organizationId') organizationId: string, @Query('startDate') startDate: string, @Query('endDate') endDate: string, @Query('instructorId') instructorId?: string, @Query('branchId') branchId?: string) { return this.service.settlement(organizationId, startDate, endDate, instructorId, branchId); }
}
