import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateServiceItemDto {
  @ApiProperty({ description: 'ID de la organización' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'Nombre del servicio (ej. Mantenimiento General)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Descripción detallada de la labor' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Categoría del servicio' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Tiempo estimado de ejecución en minutos', default: 60 })
  @IsNumber()
  @IsOptional()
  estimatedMinutes?: number;

  @ApiProperty({ description: 'Precio base de cobro por la mano de obra' })
  @IsNumber()
  @IsNotEmpty()
  basePrice: number;

  @ApiPropertyOptional({ description: 'Estado activo/inactivo', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
