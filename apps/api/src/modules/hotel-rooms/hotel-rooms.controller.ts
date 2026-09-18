import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HotelRoomsService } from './hotel-rooms.service';
import { CreateHotelRoomDto } from './dto/create-hotel-room.dto';
import { UpdateHotelRoomDto } from './dto/update-hotel-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { HotelRoomStatus } from '@prisma/client';

@ApiTags('Hotel Rooms')
@ApiBearerAuth('JWT-auth')
@Controller('hotel-rooms')
export class HotelRoomsController {
  constructor(private readonly hotelRoomsService: HotelRoomsService) {}

  @ApiOperation({ summary: 'Create a new hotel room' })
  @Permissions('hotel.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() dto: CreateHotelRoomDto) {
    return this.hotelRoomsService.create(dto);
  }

  @ApiOperation({ summary: 'Get hotel rooms list' })
  @Permissions('hotel.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: HotelRoomStatus,
    @Query('roomType') roomType?: string,
  ) {
    return this.hotelRoomsService.findAll({ organizationId, branchId, status, roomType });
  }

  @ApiOperation({ summary: 'Update room details' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() dto: UpdateHotelRoomDto,
  ) {
    return this.hotelRoomsService.update(id, organizationId, dto);
  }

  @ApiOperation({ summary: 'Update room status (e.g., to CLEANING or MAINTENANCE)' })
  @Permissions('hotel.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body('status') status: HotelRoomStatus,
  ) {
    return this.hotelRoomsService.updateStatus(id, organizationId, status);
  }

  @ApiOperation({ summary: 'Delete a hotel room' })
  @Permissions('hotel.delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.hotelRoomsService.remove(id, organizationId);
  }
}
