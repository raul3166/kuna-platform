import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateStudioAttendanceDto {
  @IsString()
  organizationId: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  documentNumber?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  studioScheduleId?: string;

  @IsDateString()
  @IsOptional()
  date?: string;
}
