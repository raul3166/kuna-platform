import { IsString, IsDateString, IsOptional, IsNumber } from 'class-validator';

export class CreateGymSubscriptionDto {
  @IsString()
  organizationId: string;

  @IsString()
  branchId: string;

  @IsString()
  customerId: string;

  @IsString()
  membershipPlanId: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsString()
  status?: string; // ACTIVE, PAUSED, EXPIRED, CANCELLED

  @IsOptional()
  @IsString()
  paymentStatus?: string; // PAID, PARTIAL, PENDING

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  paidAmount?: number;

  @IsOptional()
  @IsString()
  paymentNotes?: string;

  @IsOptional()
  @IsString()
  medicalAlerts?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
