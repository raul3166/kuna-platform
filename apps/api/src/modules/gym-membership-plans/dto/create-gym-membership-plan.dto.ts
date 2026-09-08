import { IsEnum, IsString, IsNumber, IsOptional } from 'class-validator';

export enum PlanAccessType {
  LIMITED_DAILY = 'LIMITED_DAILY',
  UNLIMITED = 'UNLIMITED',
}

export class CreateGymMembershipPlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price: number;

  @IsNumber()
  durationDays: number;

  @IsEnum(PlanAccessType)
  accessType: PlanAccessType;

  @IsString()
  organizationId: string;

  @IsString()
  @IsOptional()
  branchId?: string;
}
