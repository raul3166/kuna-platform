import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStudioSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  studioPlanId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  paymentStatus?: string; // PAID, PARTIAL, PENDING

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  paidAmount?: number;

  @IsOptional()
  @IsString()
  paymentNotes?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  medicalAlerts?: string;
}
