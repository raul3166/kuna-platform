import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsNotEmpty } from 'class-validator';

export class CreateServiceWorkerDto {
  @ApiProperty({ description: 'ID de la organización a la que pertenece' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiPropertyOptional({ description: 'ID de la sucursal (opcional)' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ description: 'Nombre del trabajador' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiPropertyOptional({ description: 'Apellido del trabajador' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ description: 'Documento de identificación (único por organización)' })
  @IsString()
  @IsNotEmpty()
  identification: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({ description: 'Correo electrónico' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'Especialidad principal del técnico' })
  @IsString()
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({ description: 'Porcentaje de comisión estándar' })
  @IsNumber()
  @IsOptional()
  commissionPercentage?: number;

  @ApiPropertyOptional({ description: 'Salario fijo si aplica' })
  @IsNumber()
  @IsOptional()
  fixedSalary?: number;

  @ApiPropertyOptional({ description: 'Estado activo/inactivo', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
