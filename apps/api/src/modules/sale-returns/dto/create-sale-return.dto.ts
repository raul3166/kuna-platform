import { IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSaleReturnDto {
  @ApiProperty({ example: 'cmrxzuv8g0000e76onfchrz1e' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ example: 'cmrzecq840001e7iwwpzi0ins' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'cmsale123456789' })
  @IsString()
  @IsNotEmpty()
  saleId: string;

  @ApiPropertyOptional({ example: 'cmcustomer0001' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ example: 'DEV-VEN-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  returnNumber: string;

  @ApiProperty({ example: '2026-08-27T00:00:00.000Z' })
  @IsDateString()
  returnDate: string;

  @ApiPropertyOptional({ example: 'Producto defectuoso de fábrica' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @ApiPropertyOptional({ example: 'Notas del administrador' })
  @IsOptional()
  @IsString()
  notes?: string;
}
