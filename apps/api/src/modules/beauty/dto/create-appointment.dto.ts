import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class AppointmentItemDto {
  @ApiProperty({ description: 'ID del servicio (ServiceItem del catálogo)' })
  @IsString()
  @IsNotEmpty()
  serviceItemId: string;

  @ApiPropertyOptional({
    description: 'Profesional específico del ítem (si difiere del principal)',
  })
  @IsString()
  @IsOptional()
  workerId?: string;
}

export class CreateAppointmentDto {
  @ApiPropertyOptional({ description: 'Organización (se infiere del contexto)' })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Sucursal (se infiere del header)' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ description: 'Cliente (Customer del Core)' })
  @IsString()
  @IsNotEmpty({ message: 'El cliente es obligatorio' })
  customerId: string;

  @ApiPropertyOptional({ description: 'Profesional principal (ServiceWorker)' })
  @IsString()
  @IsOptional()
  workerId?: string;

  @ApiProperty({ description: 'Inicio de la cita (ISO 8601)' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ type: [AppointmentItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'La cita debe incluir al menos un servicio' })
  @ValidateNested({ each: true })
  @Type(() => AppointmentItemDto)
  items: AppointmentItemDto[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

