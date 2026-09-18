import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CheckOutReservationDto {
  @ApiProperty({ example: 'cuid_org_123' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @ApiProperty({ example: 'Check-out regular de estancia' })
  @IsString()
  @IsOptional()
  notes?: string;
}

