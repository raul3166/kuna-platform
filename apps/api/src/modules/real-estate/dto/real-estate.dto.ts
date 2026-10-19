import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  RealEstatePropertyStatus,
  RealEstatePropertyType,
} from '@prisma/client';

export class CreateRealEstatePropertyDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  ownerCustomerId: string;

  @IsOptional()
  @IsString()
  agentWorkerId?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsEnum(RealEstatePropertyType)
  propertyType?: RealEstatePropertyType;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaM2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  parkingSpots?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRentPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  adminFeePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  agencyCommissionPct?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRealEstatePropertyStatusDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsEnum(RealEstatePropertyStatus)
  status: RealEstatePropertyStatus;
}

export class CreateRealEstateLeaseDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @IsString()
  @IsNotEmpty()
  tenantCustomerId: string;

  @IsOptional()
  @IsString()
  agentWorkerId?: string;

  @IsOptional()
  @IsString()
  contractNumber?: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  endDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  paymentDay?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  monthlyRent: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  adminFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  securityDeposit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  agencyCommissionPct?: number;

  @IsOptional()
  @IsString()
  coSignerName?: string;

  @IsOptional()
  @IsString()
  coSignerPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  generateFirstMonthCharge?: boolean;
}

export class GenerateRentChargeDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  @IsNotEmpty()
  leaseId: string;

  @IsString()
  @IsNotEmpty()
  periodLabel: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lateFeeAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateRealEstateConfigDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultAgencyCommissionPct?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  defaultPaymentDay?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lateFeeInterestPct?: number;

  @IsOptional()
  @IsBoolean()
  autoGenerateFirstRentCharge?: boolean;
}

