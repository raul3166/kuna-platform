import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSaleReturnItemDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'cmsalereturn123456789' })
  saleReturnId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'cmsaleitem987654321' })
  saleItemId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'cmproduct0001e78k13' })
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @ApiProperty({ example: 2 })
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 3500.00 })
  unitCost: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Empaque roto' })
  notes?: string;
}
