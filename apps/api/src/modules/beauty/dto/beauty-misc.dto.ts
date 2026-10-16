import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class RescheduleAppointmentDto {
  @ApiProperty({ description: 'Nuevo inicio (ISO 8601)' })
  @IsDateString()
  startAt: string;

  @ApiPropertyOptional({ description: 'Nuevo profesional principal' })
  @IsString()
  @IsOptional()
  workerId?: string;
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: AppointmentStatus })
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Motivo (cancelación / no-show)' })
  @IsString()
  @IsOptional()
  reason?: string;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ScheduleBlockDto {
  @ApiProperty({ description: '0 = domingo ... 6 = sábado' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00' })
  @Matches(HHMM, { message: 'startTime debe tener formato HH:mm' })
  startTime: string;

  @ApiProperty({ example: '18:00' })
  @Matches(HHMM, { message: 'endTime debe tener formato HH:mm' })
  endTime: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class SetWorkerScheduleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiProperty({ type: [ScheduleBlockDto] })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ScheduleBlockDto)
  blocks: ScheduleBlockDto[];
}

export class CreateTimeOffDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  workerId: string;

  @ApiProperty()
  @IsDateString()
  startAt: string;

  @ApiProperty()
  @IsDateString()
  endAt: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  reason?: string;
}

export class CreateBeautyNoteDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  workerId?: string;

  @ApiProperty({ example: 'Fórmula de color' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: '6.1 + 7.0 (1:1) oxidante 20vol, 35 min' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class UpdateBeautyConfigDto {
  @ApiPropertyOptional({ description: 'Duración de cada casilla de la agenda en minutos' })
  @IsInt()
  @Min(5)
  @Max(120)
  @IsOptional()
  slotMinutes?: number;

  @ApiPropertyOptional({ example: '08:00' })
  @Matches(HHMM)
  @IsOptional()
  dayStart?: string;

  @ApiPropertyOptional({ example: '20:00' })
  @Matches(HHMM)
  @IsOptional()
  dayEnd?: string;

  @ApiPropertyOptional({ description: 'Permitir citas que se cruzan para un mismo profesional' })
  @IsBoolean()
  @IsOptional()
  allowOverlap?: boolean;
}

