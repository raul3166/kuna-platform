import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { FuelLevel } from '@prisma/client';

export class CreateVehicleCheckInDto {
  @ApiPropertyOptional({ description: 'ID de la organización' })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'ID de la sucursal' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ description: 'ID del vehículo que ingresa al taller' })
  @IsString()
  @IsNotEmpty({ message: 'El vehículo es obligatorio' })
  vehicleId: string;

  @ApiProperty({ description: 'Kilometraje registrado al momento de ingreso' })
  @IsInt()
  @Min(0)
  mileage: number;

  @ApiPropertyOptional({
    description: 'Nivel de combustible',
    enum: FuelLevel,
    default: FuelLevel.HALF,
  })
  @IsEnum(FuelLevel)
  @IsOptional()
  fuelLevel?: FuelLevel;

  @ApiPropertyOptional({ description: 'Detalle visual de daños o carrocería (rayones, golpes)' })
  @IsOptional()
  damages?: any;

  @ApiPropertyOptional({ description: 'Checklist de inventario de accesorios y herramientas' })
  @IsOptional()
  inventoryCheck?: any;

  @ApiPropertyOptional({ description: 'Objetos personales o de valor declarados' })
  @IsString()
  @IsOptional()
  customerBelongings?: string;

  @ApiPropertyOptional({ description: 'Motivo de ingreso o falla reportada' })
  @IsString()
  @IsOptional()
  receptionNotes?: string;

  @ApiPropertyOptional({ description: 'Técnico o mecánico asignado inicialmente' })
  @IsString()
  @IsOptional()
  assignedWorkerId?: string;

  @ApiPropertyOptional({ description: 'Crear automáticamente una orden de servicio asociada' })
  @IsOptional()
  createServiceOrder?: boolean;

  @ApiPropertyOptional({ description: 'ID del servicio del catálogo si se crea orden' })
  @IsString()
  @IsOptional()
  serviceItemId?: string;
}

