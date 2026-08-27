import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'cmrxzuv8g0000e76onfchrz1e' })
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'cmsale123456789' })
  saleId: string;

  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  @ApiProperty({ example: 'CASH', enum: PaymentMethod })
  method: PaymentMethod;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 45000.00 })
  amount: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'VOUCHER-9988' })
  reference?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Pago recibido completo' })
  notes?: string;
}
