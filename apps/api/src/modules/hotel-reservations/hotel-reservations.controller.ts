import { Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HotelReservationsService } from './hotel-reservations.service';
import { CreateHotelReservationDto } from './dto/create-hotel-reservation.dto';
import { CheckOutReservationDto } from './dto/checkout-reservation.dto';
import { CreateHotelRoomChargeDto } from './dto/create-hotel-room-charge.dto';
import { TransferRoomDto } from './dto/transfer-room.dto';
import { ExtendStayDto } from './dto/extend-stay.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
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

  @ApiOperation({ summary: 'Get occupancy and revenue report' })
  @Permissions('hotel.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('reports/occupancy')
  getOccupancyReport(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.hotelReservationsService.getOccupancyReport(organizationId, branchId, from, to);
  }

  // =========================================================================
  // ENDPOINTS PÚBLICOS (AUTOGESTIÓN DE HUÉSPEDES SIN LOGIN)
  // =========================================================================

  @ApiOperation({ summary: 'Public hotel catalog and room availability by date range' })
  @Get('public/catalog/:slug')
  getPublicCatalog(
    @Param('slug') slug: string,
    @Query('checkInDate') checkInDate?: string,
    @Query('checkOutDate') checkOutDate?: string,
    @Query('guests') guests?: string,
  ) {
    return this.hotelReservationsService.getPublicHotelCatalog(slug, checkInDate, checkOutDate, guests);
  }

  @ApiOperation({ summary: 'Public guest lookup by document, email or phone' })
  @Get('public/guest/:slug')
  getPublicGuestStatus(
    @Param('slug') slug: string,
    @Query('identifier') identifier: string,
  ) {
    return this.hotelReservationsService.getPublicGuestStatus(slug, identifier);
  }

  @ApiOperation({ summary: 'Public guest reservation request (creates PENDING reservation)' })
  @Post('public/book/:slug')
  createPublicReservation(
    @Param('slug') slug: string,
    @Body()
    body: {
      hotelRoomId: string;
      checkInDate: string;
      checkOutDate: string;
      guests?: number;
      customerId?: string;
      firstName?: string;
      lastName?: string;
      identificationType?: string;
      identificationNumber?: string;
      email?: string;
      phoneNumber?: string;
      paymentMethod?: string;
      paymentReference?: string;
      notes?: string;
    },
  ) {
    return this.hotelReservationsService.createPublicReservation(slug, body);
  }

  @ApiOperation({ summary: 'Public guest reservation cancellation' })
  @Patch('public/cancel/:slug/:reservationId')
  cancelPublicReservation(
    @Param('slug') slug: string,
    @Param('reservationId') reservationId: string,
    @Body() body: { customerId: string; reason?: string },
  ) {
    return this.hotelReservationsService.cancelPublicReservation(slug, reservationId, body.customerId, body.reason);
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

  @ApiOperation({ summary: 'Confirm a pending reservation (1-click approval by hotel admin)' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/confirm')
  confirmReservation(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.hotelReservationsService.confirmReservation(id, organizationId);
  }

  @ApiOperation({ summary: 'Check-In: reservation to CHECKED_IN & room to OCCUPIED' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/check-in')
  checkIn(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.hotelReservationsService.checkIn(id, organizationId);
  }

  @ApiOperation({ summary: 'Check-Out: generate invoice & transition room to CLEANING' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/check-out')
  checkOut(
    @Param('id') id: string,
    @Body() dto: CheckOutReservationDto,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.hotelReservationsService.checkOut(id, organizationId, dto);
  }

  @ApiOperation({ summary: 'Cancel a reservation' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/cancel')
  cancel(
    @Param('id') id: string,
    @Body() dto: CancelReservationDto,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.hotelReservationsService.cancel(id, organizationId, dto);
  }

  @ApiOperation({ summary: 'Transfer guest to a different room' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/transfer-room')
  transferRoom(
    @Param('id') id: string,
    @Body() dto: TransferRoomDto,
  ) {
    return this.hotelReservationsService.transferRoom(id, dto);
  }

  @ApiOperation({ summary: 'Extend guest stay to a new check-out date' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/extend')
  extendStay(
    @Param('id') id: string,
    @Body() dto: ExtendStayDto,
  ) {
    return this.hotelReservationsService.extendStay(id, dto);
  }

  @ApiOperation({ summary: 'Mark reservation as No-Show' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/no-show')
  markAsNoShow(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.hotelReservationsService.markAsNoShow(id, organizationId);
  }

  // --- CARGOS A LA HABITACIÓN ---
  @ApiOperation({ summary: 'Add extra charge to a reservation' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/charges')
  addCharge(
    @Param('id') reservationId: string,
    @Body() dto: CreateHotelRoomChargeDto,
  ) {
    return this.hotelReservationsService.addCharge(reservationId, dto);
  }

  @ApiOperation({ summary: 'Get charges for a reservation' })
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
