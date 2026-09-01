import { IsOptional, IsString, IsDateString } from 'class-validator';

export class SalesPerformanceQueryDto {
  @IsString()
  organizationId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  channel?: string;
}
