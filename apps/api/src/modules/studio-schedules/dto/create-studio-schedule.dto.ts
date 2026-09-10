import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class CreateStudioScheduleDto {
  @ApiProperty({ example: 'Hatha Yoga' })
  @IsString()
  @IsNotEmpty()
  className: string;

  @ApiPropertyOptional({ example: 'María García' })
  @IsString()
  @IsOptional()
  instructorName?: string;

  @ApiProperty({ example: 1, description: '0=Domingo, 1=Lunes, ..., 6=Sábado' })
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  instructorId?: string;

  @IsNumber()
  @Min(0)
  @Max(6)
  @IsNotEmpty()
  dayOfWeek: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({ example: 15, default: 15 })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  capacity: number;

  @ApiPropertyOptional({ example: 'Llegar 10 minutos antes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  branchId?: string;
}
