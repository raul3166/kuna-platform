import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, IsNumber } from 'class-validator';
import { HotelRoomStatus } from '@prisma/client';

export class CreateHotelRoomDto {
  @ApiProperty({ example: 'cuid_org_123' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ example: 'cuid_branch_123' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: '101' })
  @IsString()
  @IsNotEmpty()
  roomNumber: string;

  @ApiProperty({ example: 'SUITE' })
  @IsString()
  @IsNotEmpty()
  roomType: string;

  @ApiProperty({ example: 'Habitación con vista al mar' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsOptional()
  capacity?: number;

  @ApiProperty({ example: 150000.00 })
  @IsNumber()
  @IsOptional()
  pricePerNight?: number;

  @ApiProperty({ enum: HotelRoomStatus, required: false, default: HotelRoomStatus.AVAILABLE })
  @IsEnum(HotelRoomStatus)
  @IsOptional()
  status?: HotelRoomStatus;
}
