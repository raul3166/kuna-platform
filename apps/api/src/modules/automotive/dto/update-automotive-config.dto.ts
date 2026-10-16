import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateAutomotiveConfigDto {
  @ApiPropertyOptional({ description: 'Cantidad de bahías o puestos de trabajo en el taller', example: 4 })
  @IsInt()
  @Min(1)
  @IsOptional()
  baysCount?: number;

  @ApiPropertyOptional({ description: 'Checklist predeterminado de recepción', example: ['Gato', 'Llanta repuesto', 'Radio', 'Documentos'] })
  @IsArray()
  @IsOptional()
  defaultInventoryChecklist?: string[];

  @ApiPropertyOptional({ description: 'Texto legal o términos del recibo de ingreso del vehículo' })
  @IsString()
  @IsOptional()
  receptionTerms?: string;

  @ApiPropertyOptional({ description: 'Notificar al cliente al completar la orden' })
  @IsOptional()
  enableCustomerNotifications?: boolean;
}
