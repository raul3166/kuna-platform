import { Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HotelReservationsService } from './hotel-reservations.service';
import { CreateHotelReservationDto } from './dto/create-hotel-reservation.dto';
import { CheckOutReservationDto } from './dto/checkout-reservation.dto';
import { CreateHotelRoomChargeDto } from './dto/create-hotel-room-charge.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ReservationStatus } from '@prisma/client';

@ApiTags('Hotel Reservations')
@ApiBearerAuth('JWT-auth')
@Controller('hotel-reservations')
export class HotelReservationsController {
  constructor(private readonly hotelReservationsService: HotelReservationsService) {}

  @ApiOperation({ summary: 'Create a new hotel room reservation' })
  @Permissions('hotel.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() dto: CreateHotelReservationDto) {
    return this.hotelReservationsService.create(dto);
  }

  @ApiOperation({ summary: 'Get hotel reservations list' })
  @Permissions('hotel.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
    @Query('hotelRoomId') hotelRoomId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: ReservationStatus,
  ) {
    return this.hotelReservationsService.findAll({
      organizationId,
      branchId,
      hotelRoomId,
      customerId,
      status,
    });
  }

  @ApiOperation({ summary: 'Get reservation detail by ID' })
  @Permissions('hotel.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.hotelReservationsService.findOne(id, organizationId);
  }

  @ApiOperation({ summary: 'Check-In flow: transition reservation to CHECKED_IN & room to OCCUPIED' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/check-in')
  checkIn(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.hotelReservationsService.checkIn(id, organizationId);
  }

  @ApiOperation({ summary: 'Check-Out flow: transition reservation to CHECKED_OUT, room to CLEANING, & generate invoice' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/check-out')
  checkOut(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() dto: CheckOutReservationDto,
  ) {
    return this.hotelReservationsService.checkOut(id, organizationId, dto);
  }

  @ApiOperation({ summary: 'Cancel a reservation' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.hotelReservationsService.cancel(id, organizationId);
  }

  // --- CARGOS A LA HABITACIÓN ---
  @ApiOperation({ summary: 'Add extra charge / consumption to a reservation' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/charges')
  addCharge(
    @Param('id') reservationId: string,
    @Body() dto: CreateHotelRoomChargeDto,
  ) {
    return this.hotelReservationsService.addCharge(reservationId, dto);
  }

  @ApiOperation({ summary: 'Get charges / extra consumptions for a reservation' })
  @Permissions('hotel.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id/charges')
  getCharges(
    @Param('id') reservationId: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.hotelReservationsService.getCharges(reservationId, organizationId);
  }

  @ApiOperation({ summary: 'Remove a charge item from a reservation' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete('charges/:chargeId')
  removeCharge(
    @Param('chargeId') chargeId: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.hotelReservationsService.removeCharge(chargeId, organizationId);
  }
}
