import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

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
}
