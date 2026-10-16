import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { VehicleType } from '@prisma/client';

export class CreateVehicleDto {
  @ApiPropertyOptional({ description: 'ID de la organización (opcional si se infiere del contexto)' })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({ description: 'ID del cliente propietario del vehículo' })
  @IsString()
  @IsNotEmpty({ message: 'El cliente propietario es obligatorio' })
  customerId: string;

  @ApiProperty({ description: 'Placa o patente del vehículo', example: 'ABC-123' })
  @IsString()
  @IsNotEmpty({ message: 'La placa o patente es obligatoria' })
  licensePlate: string;

  @ApiProperty({ description: 'Marca del vehículo', example: 'Toyota' })
  @IsString()
  @IsNotEmpty({ message: 'La marca es obligatoria' })
  brand: string;

  @ApiProperty({ description: 'Modelo del vehículo', example: 'Corolla' })
  @IsString()
  @IsNotEmpty({ message: 'El modelo es obligatorio' })
  model: string;

  @ApiPropertyOptional({ description: 'Año del modelo', example: 2022 })
  @IsInt()
  @Min(1900)
  @IsOptional()
  year?: number;

  @ApiPropertyOptional({ description: 'Color del vehículo', example: 'Gris Plata' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Número de chasis / VIN' })
  @IsString()
  @IsOptional()
  vin?: string;

  @ApiPropertyOptional({ description: 'Kilometraje actual', example: 45000 })
  @IsInt()
  @Min(0)
  @IsOptional()
  mileage?: number;

  @ApiPropertyOptional({
    description: 'Tipo de vehículo',
    enum: VehicleType,
    default: VehicleType.CAR,
  })
  @IsEnum(VehicleType)
  @IsOptional()
  vehicleType?: VehicleType;

  @ApiPropertyOptional({ description: 'Tipo de combustible', example: 'Gasolina' })
  @IsString()
  @IsOptional()
  fuelType?: string;

  @ApiPropertyOptional({ description: 'Observaciones generales del vehículo' })
  @IsString()
  @IsOptional()
  notes?: string;
}

