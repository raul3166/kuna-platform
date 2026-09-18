import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsInt } from 'class-validator';

export class CreateHotelRoomChargeDto {
  @ApiProperty({ example: 'cuid_org_123' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ example: 'Consumo Minibar - Agua y Snacks' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: 1, default: 1 })
  @IsInt()
  @IsOptional()
  quantity?: number;

  @ApiProperty({ example: 'cuid_product_123' })
  @IsString()
  @IsOptional()
  productId?: string;
}

