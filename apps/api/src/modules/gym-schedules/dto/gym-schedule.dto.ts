import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateGymScheduleDto {
  @IsString() @IsNotEmpty() organizationId: string;
  @IsOptional() @IsString() branchId?: string;
  @IsString() @IsNotEmpty() name: string;
  @IsInt() @Min(0) @Max(6) dayOfWeek: number;
  @IsString() @IsNotEmpty() startTime: string; // Ej: "06:00"
  @IsString() @IsNotEmpty() endTime: string;   // Ej: "12:00"
  @IsOptional() @IsString() instructorId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateGymScheduleDto extends PartialType(CreateGymScheduleDto) {}

export class CreateGymShiftOverrideDto {
  @IsString() @IsNotEmpty() organizationId: string;
  @IsString() @IsNotEmpty() gymScheduleId: string;
  @IsString() @IsNotEmpty() instructorId: string;
  @IsString() @IsNotEmpty() shiftDate: string; // YYYY-MM-DD
  @IsOptional() @IsString() notes?: string;
}

