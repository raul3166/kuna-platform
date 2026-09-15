import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNotEmpty, IsDateString, IsNumber } from 'class-validator';
import { ServiceOrderStatus } from '@prisma/client';

export class CreateServiceOrderDto {
  @ApiProperty({ description: 'ID de la organización' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiPropertyOptional({ description: 'ID de la sucursal' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ description: 'Número único de la orden' })
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @ApiProperty({ description: 'Nombre del activo o equipo a dar servicio' })
  @IsString()
  @IsNotEmpty()
  assetName: string;

  @ApiProperty({ description: 'ID del cliente asociado a la orden' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ description: 'ID del técnico principal o responsable' })
  @IsString()
  @IsOptional()
  assignedWorkerId?: string;

  @ApiPropertyOptional({ description: 'Notas o descripción del problema/solicitud' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Fecha programada para el servicio' })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({ enum: ServiceOrderStatus, default: ServiceOrderStatus.PENDING })
  @IsEnum(ServiceOrderStatus)
  @IsOptional()
  status?: ServiceOrderStatus;

  @ApiPropertyOptional({ description: 'ID del ítem del catálogo de servicios' })
  @IsString()
  @IsOptional()
  serviceItemId?: string;

  @ApiPropertyOptional({ description: 'Total de mano de obra inicial' })
  @IsNumber()
  @IsOptional()
  laborTotal?: number;
}
