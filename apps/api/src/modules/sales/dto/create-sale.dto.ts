import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSaleDto {
  @ApiProperty({
    example: 'cmrxzuv8g0000e76onfchrz1e',
    description: 'Organization identifier',
  })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    example: 'cmrzecq840001e7iwwpzi0ins',
    description: 'Branch identifier',
  })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({
    example: 'cmcustomer000000000000001',
    description: 'Customer identifier',
    required: false,
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({
    example: 'VEN-000001',
    description: 'Sale number unique within the organization',
  })
  @IsString()
  @IsNotEmpty()
  saleNumber: string;

  @ApiPropertyOptional({
    example: 'Venta mostrador',
    description: 'Additional notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
