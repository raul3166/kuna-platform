import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StudioBookingsService } from './studio-bookings.service';
import { CreateStudioBookingDto } from './dto/create-studio-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { BookingStatus } from '@prisma/client';

@ApiTags('Studio Bookings')
@ApiBearerAuth('JWT-auth')
@Controller('studio-bookings')
export class StudioBookingsController {
  constructor(private readonly studioBookingsService: StudioBookingsService) {}

  @ApiOperation({ summary: 'Create a new studio class booking' })
  @Permissions('studio.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() dto: CreateStudioBookingDto) {
    return this.studioBookingsService.create(dto);
  }

  @ApiOperation({ summary: 'Get studio bookings list' })
  @Permissions('studio.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
    @Query('studioScheduleId') studioScheduleId?: string,
    @Query('customerId') customerId?: string,
    @Query('bookingDate') bookingDate?: string,
    @Query('status') status?: BookingStatus,
  ) {
    return this.studioBookingsService.findAll({
      organizationId,
      branchId,
      studioScheduleId,
      customerId,
      bookingDate,
      status,
    });
  }

  @ApiOperation({ summary: 'Get availability and capacity for a class schedule on a date' })
  @Permissions('studio.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('availability')
  getAvailability(
    @Query('organizationId') organizationId: string,
    @Query('studioScheduleId') studioScheduleId: string,
    @Query('bookingDate') bookingDate: string,
  ) {
    return this.studioBookingsService.getAvailability(organizationId, studioScheduleId, bookingDate);
  }

  @ApiOperation({ summary: 'Public student portal: get studio plans, schedules and availability' })
  @Get('public/catalog/:slug')
  getPublicCatalog(
    @Param('slug') slug: string,
    @Query('date') date?: string,
  ) {
    return this.studioBookingsService.getPublicCatalog(slug, date);
  }

  @ApiOperation({ summary: 'Public student portal: lookup student active tiquetera and bookings' })
  @Get('public/student/:slug')
  getPublicStudentStatus(
    @Param('slug') slug: string,
    @Query('identifier') identifier: string,
  ) {
    return this.studioBookingsService.getPublicStudentStatus(slug, identifier);
  }

  @ApiOperation({ summary: 'Public student portal: book a class spot using active tiquetera' })
  @Post('public/book/:slug')
  createPublicBooking(
    @Param('slug') slug: string,
    @Body() body: { customerId: string; studioScheduleId: string; bookingDate: string },
  ) {
    return this.studioBookingsService.createPublicBooking(slug, body);
  }

  @ApiOperation({ summary: 'Public student portal: cancel student own booking' })
  @Patch('public/cancel/:slug/:bookingId')
  cancelPublicBooking(
    @Param('slug') slug: string,
    @Param('bookingId') bookingId: string,
    @Body('customerId') customerId: string,
  ) {
    return this.studioBookingsService.cancelPublicBooking(slug, bookingId, customerId);
  }

  @ApiOperation({ summary: 'Get booking detail by ID' })
  @Permissions('studio.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.studioBookingsService.findOne(id, organizationId);
  }

  @ApiOperation({ summary: 'Cancel a booking' })
  @Permissions('studio.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.studioBookingsService.cancel(id, organizationId);
  }
}
