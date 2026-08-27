import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCashSessionDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'cmrxzuv8g0000e76onfchrz1e' })
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'cmrzecq840001e7iwwpzi0ins' })
  branchId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'cms4ozwly0001e7bggokhix3p' })
  userId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 50000.00, description: 'Base de efectivo inicial' })
  openingBalance: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({ example: 'Turno de la mañana - Caja 1' })
  notes?: string;
}
