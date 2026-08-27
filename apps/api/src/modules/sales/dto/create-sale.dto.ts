import {
  IsNotEmpty,
  IsOptional, // <-- Añadir este import si no está
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

  // --- CORREGIDO: SE CAMBIA A OPCIONAL PARA PERMITIR AUTOCONSEGUTIVOS ---
  @ApiPropertyOptional({
    example: 'VEN-000001',
    description: 'Sale number unique within the organization',
  })
  @IsString()
  @IsOptional() // <-- CORREGIDO: Cambiado de IsNotEmpty a IsOptional
  saleNumber?: string; // <-- CORREGIDO: Se le añade el signo ? de opcional

  @ApiPropertyOptional({
    example: 'Venta mostrador',
    description: 'Additional notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
