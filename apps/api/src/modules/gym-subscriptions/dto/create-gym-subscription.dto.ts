import { IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';

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
  status?: string; // ACTIVE, EXPIRED, CANCELLED

  @IsOptional()
  @IsString()
  paymentStatus?: string; // PAID, PENDING
}
