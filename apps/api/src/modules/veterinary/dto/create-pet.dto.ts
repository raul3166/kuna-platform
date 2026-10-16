import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { PetSpecies, PetGender } from '@prisma/client';

export class CreatePetDto {
  @ApiPropertyOptional({ description: 'ID de la organización' })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({ description: 'ID del cliente propietario / tutor' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: 'Nombre de la mascota', example: 'Max' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: PetSpecies, default: PetSpecies.CANINE })
  @IsEnum(PetSpecies)
  @IsOptional()
  species?: PetSpecies;

  @ApiPropertyOptional({ description: 'Raza', example: 'Golden Retriever' })
  @IsString()
  @IsOptional()
  breed?: string;

  @ApiPropertyOptional({ enum: PetGender, default: PetGender.UNKNOWN })
  @IsEnum(PetGender)
  @IsOptional()
  gender?: PetGender;

  @ApiPropertyOptional({ description: 'Fecha de nacimiento aproximada o exacta (ISO)' })
  @IsDateString()
  @IsOptional()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Color / pelaje', example: 'Dorado' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: 'Peso actual en kilogramos', example: 28.5 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Número de microchip o identificación' })
  @IsString()
  @IsOptional()
  microchipNumber?: string;

  @ApiPropertyOptional({ description: '¿Está esterilizado/castrado?', default: false })
  @IsBoolean()
  @IsOptional()
  isSterilized?: boolean;

  @ApiPropertyOptional({ description: 'Alergias conocidas (medicamentos, alimentos)' })
  @IsString()
  @IsOptional()
  allergies?: string;

  @ApiPropertyOptional({ description: 'Condiciones crónicas o antecedentes previos' })
  @IsString()
  @IsOptional()
  chronicIssues?: string;

  @ApiPropertyOptional({ description: 'Observaciones adicionales o temperamento' })
  @IsString()
  @IsOptional()
  notes?: string;
}

