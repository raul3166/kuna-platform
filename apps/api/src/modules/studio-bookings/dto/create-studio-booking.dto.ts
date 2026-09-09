import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { BookingStatus } from '@prisma/client';

export class CreateStudioBookingDto {
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

  @ApiProperty({ example: 'cuid_schedule_123' })
  @IsString()
  @IsNotEmpty()
  studioScheduleId: string;

  @ApiProperty({ example: '2026-09-09' })
  @IsDateString()
  @IsNotEmpty()
  bookingDate: string;

  @ApiProperty({ enum: BookingStatus, required: false, default: BookingStatus.CONFIRMED })
  @IsEnum(BookingStatus)
  @IsOptional()
  status?: BookingStatus;
}
