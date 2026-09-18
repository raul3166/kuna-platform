import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsNumber } from 'class-validator';
import { ReservationStatus } from '@prisma/client';

export class CreateHotelReservationDto {
  @ApiProperty({ example: 'cuid_org_123' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ example: 'cuid_branch_123' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'cuid_customer_123' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'cuid_hotel_room_123' })
  @IsString()
  @IsNotEmpty()
  hotelRoomId: string;

  @ApiProperty({ example: '2026-10-15' })
  @IsDateString()
  @IsNotEmpty()
  checkInDate: string;

  @ApiProperty({ example: '2026-10-20' })
  @IsDateString()
  @IsNotEmpty()
  checkOutDate: string;

  @ApiProperty({ example: 150000 })
  @IsNumber()
  @IsOptional()
  nightlyRate?: number;

  @ApiProperty({ example: 750000 })
  @IsNumber()
  @IsOptional()
  totalAmount?: number;

  @ApiProperty({ example: 'Huésped solicita cama adicional' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ enum: ReservationStatus, required: false, default: ReservationStatus.CONFIRMED })
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;
}
