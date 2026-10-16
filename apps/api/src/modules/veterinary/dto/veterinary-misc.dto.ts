import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VetVisitType } from '@prisma/client';

export class VetMaterialInputDto {
  @ApiProperty({ description: 'ID del producto / medicamento utilizado' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: 'Cantidad utilizada', example: 1 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ description: 'Precio unitario (si se omite usa el del producto)' })
  @IsNumber()
  @IsOptional()
  unitPrice?: number;
}

export class CreateMedicalRecordDto {
  @ApiPropertyOptional({ description: 'ID de la organización' })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({ description: 'ID de la sucursal de atención' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ description: 'ID de la mascota paciente' })
  @IsString()
  @IsNotEmpty()
  petId: string;

  @ApiPropertyOptional({ description: 'ID del médico veterinario o estilista (ServiceWorker)' })
  @IsString()
  @IsOptional()
  veterinarianId?: string;

  @ApiPropertyOptional({ enum: VetVisitType, default: VetVisitType.CONSULTATION })
  @IsEnum(VetVisitType)
  @IsOptional()
  visitType?: VetVisitType;

  @ApiPropertyOptional({ description: 'Fecha/hora de la atención' })
  @IsDateString()
  @IsOptional()
  visitDate?: string;

  @ApiPropertyOptional({ description: 'Peso registrado en kg', example: 12.4 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Temperatura rectal en °C', example: 38.5 })
  @IsNumber()
  @IsOptional()
  temperatureC?: number;

  @ApiPropertyOptional({ description: 'Frecuencia cardíaca (latidos por minuto)', example: 90 })
  @IsNumber()
  @IsOptional()
  heartRateBpm?: number;

  @ApiPropertyOptional({ description: 'Frecuencia respiratoria (respiraciones por minuto)', example: 24 })
  @IsNumber()
  @IsOptional()
  respiratoryRate?: number;

  @ApiProperty({ description: 'Motivo de consulta o ingreso' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Anamnesis / historia reportada por el tutor' })
  @IsString()
  @IsOptional()
  anamnesis?: string;

  @ApiPropertyOptional({ description: 'Hallazgos del examen físico' })
  @IsString()
  @IsOptional()
  physicalExam?: string;

  @ApiPropertyOptional({ description: 'Diagnóstico presuntivo o definitivo' })
  @IsString()
  @IsOptional()
  diagnosis?: string;

  @ApiPropertyOptional({ description: 'Tratamiento realizado en clínica' })
  @IsString()
  @IsOptional()
  treatment?: string;

  @ApiPropertyOptional({ description: 'Fórmula médica / indicaciones para casa' })
  @IsString()
  @IsOptional()
  prescription?: string;

  @ApiPropertyOptional({ description: 'Fecha sugerida de próximo control' })
  @IsDateString()
  @IsOptional()
  nextControlDate?: string;

  @ApiPropertyOptional({ description: 'Notas internas adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: 'Crear orden de servicio automáticamente para cobro en POS', default: true })
  @IsBoolean()
  @IsOptional()
  createServiceOrder?: boolean;

  @ApiPropertyOptional({ description: 'ID del servicio del catálogo (Consulta, Peluquería, Cirugía)' })
  @IsString()
  @IsOptional()
  serviceItemId?: string;

  @ApiPropertyOptional({ description: 'Valor de honorarios / consulta si no se elige serviceItemId o se desea ajustar' })
  @IsNumber()
  @IsOptional()
  laborTotal?: number;

  @ApiPropertyOptional({ description: 'Insumos o medicamentos aplicados durante la consulta', type: [VetMaterialInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VetMaterialInputDto)
  @IsOptional()
  materials?: VetMaterialInputDto[];
}

export class CreateVaccinationDto {
  @ApiPropertyOptional({ description: 'ID de la organización' })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({ description: 'ID de la sucursal' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ description: 'ID de la mascota' })
  @IsString()
  @IsNotEmpty()
  petId: string;

  @ApiPropertyOptional({ description: 'ID del veterinario que aplica (ServiceWorker)' })
  @IsString()
  @IsOptional()
  veterinarianId?: string;

  @ApiPropertyOptional({ description: 'ID del producto de inventario (vacuna / antiparasitario)' })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({ description: 'Nombre de la vacuna o desparasitante', example: 'Séxtuple Canina' })
  @IsString()
  @IsNotEmpty()
  vaccineName: string;

  @ApiPropertyOptional({ description: 'Tipo: VACCINE, DEWORMING, ANTIPARASITIC', default: 'VACCINE' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Lote o serie del biológico' })
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @ApiPropertyOptional({ description: 'Dosis aplicada', example: '1 ml SC' })
  @IsString()
  @IsOptional()
  dose?: string;

  @ApiPropertyOptional({ description: 'Fecha de aplicación' })
  @IsDateString()
  @IsOptional()
  appliedAt?: string;

  @ApiPropertyOptional({ description: 'Fecha de próximo refuerzo' })
  @IsDateString()
  @IsOptional()
  nextDueDate?: string;

  @ApiPropertyOptional({ description: 'Notas de la aplicación' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ description: '¿Descontar 1 unidad del stock del producto vinculado?', default: false })
  @IsBoolean()
  @IsOptional()
  deductStock?: boolean;
}

export class UpdateVeterinaryConfigDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Días de anticipación para alertas de vacunas/refuerzos', default: 15 })
  @IsNumber()
  @IsOptional()
  vaccinationAlertDays?: number;

  @ApiPropertyOptional({ description: 'Duración promedio de consulta en minutos', default: 30 })
  @IsNumber()
  @IsOptional()
  defaultConsultationMinutes?: number;

  @ApiPropertyOptional({ description: 'Generar orden de servicio por defecto al guardar consulta', default: true })
  @IsBoolean()
  @IsOptional()
  autoCreateOrderOnConsultation?: boolean;

  @ApiPropertyOptional({ description: 'Habilitar peluquería canina/felina (Grooming)', default: true })
  @IsBoolean()
  @IsOptional()
  enableGrooming?: boolean;
}

