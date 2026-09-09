import { IsEnum, IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export enum StudioPlanType {
  CLASS_PACK = 'CLASS_PACK',
  UNLIMITED = 'UNLIMITED',
}

export class CreateStudioPlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price: number;

  @IsNumber()
  durationDays: number;

  @IsEnum(StudioPlanType)
  type: StudioPlanType;

  @IsOptional()
  @IsNumber()
  totalClasses?: number; // Requerido si type === 'CLASS_PACK'

  @IsOptional()
  @IsNumber()
  maxDailyCheckIns?: number; // Por defecto 2 para ilimitados

  @IsOptional()
  @IsBoolean()
  isNewStudentOnly?: boolean;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsString()
  organizationId: string;

  @IsOptional()
  @IsString()
  branchId?: string;
}
