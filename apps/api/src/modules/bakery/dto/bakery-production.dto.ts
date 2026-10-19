import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BakeryProductionStatus } from '@prisma/client';

export class CreateBakeryProductionOrderDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  recipeId: string;

  @IsOptional()
  @IsString()
  bakerWorkerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.1)
  batchesMultiplier?: number;

  @IsOptional()
  @IsString()
  ovenNumber?: string;

  @IsOptional()
  @IsString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBakeryProductionStatusDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsEnum(BakeryProductionStatus)
  status: BakeryProductionStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  wasteQuantity?: number;

  @IsOptional()
  @IsString()
  wasteReason?: string;

  @IsOptional()
  @IsString()
  ovenNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateBakeryConfigDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  defaultShelfLifeDays?: number;

  @IsOptional()
  @IsBoolean()
  autoCreateProductLotOnBake?: boolean;

  @IsOptional()
  @IsBoolean()
  autoDeductIngredientsOnBake?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxWasteAlertPct?: number;
}

