import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  Min,
} from 'class-validator';
import { LaundryTicketStatus } from '@prisma/client';

export class UpdateLaundryStatusDto {
  @ApiPropertyOptional({ description: 'ID de la organización' })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({ enum: LaundryTicketStatus, description: 'Nueva fase del ticket de lavandería' })
  @IsEnum(LaundryTicketStatus)
  status: LaundryTicketStatus;

  @ApiPropertyOptional({ description: 'Ubicación en perchero o casillero al terminar (ej: Estante B-08)' })
  @IsString()
  @IsOptional()
  rackLocation?: string;

  @ApiPropertyOptional({ description: 'ID del operario asignado a la fase actual' })
  @IsString()
  @IsOptional()
  workerId?: string;

  @ApiPropertyOptional({ description: 'Notas de proceso o entrega' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateLaundryConfigDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Precio base por kilogramo de lavado ($)', default: 6000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  defaultPricePerKg?: number;

  @ApiPropertyOptional({ description: 'Porcentaje de recargo por servicio Express (%)', default: 30 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  expressSurchargePct?: number;

  @ApiPropertyOptional({ description: 'Tiempo estimado de entrega estándar en horas', default: 24 })
  @IsNumber()
  @Min(1)
  @IsOptional()
  defaultPromisedHours?: number;

  @ApiPropertyOptional({ description: 'Generar Orden de Servicio automáticamente al recibir prendas', default: true })
  @IsBoolean()
  @IsOptional()
  autoCreateServiceOrder?: boolean;
}

