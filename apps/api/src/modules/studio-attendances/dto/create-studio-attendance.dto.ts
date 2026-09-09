import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateStudioAttendanceDto {
  @IsString()
  organizationId: string;

  @IsString()
  branchId: string;

  @IsString()
  documentNumber: string;

  @IsString()
  @IsOptional()
  studioScheduleId?: string;

  @IsDateString()
  @IsOptional() // Déjalo opcional si deseas usar la fecha actual del servidor por defecto cuando no se envíe
  date?: string;
}
