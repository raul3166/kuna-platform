import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { TaxType } from '@prisma/client';

export class CreateTaxDto {
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(TaxType)
  @IsNotEmpty()
  type: TaxType;

  @IsNumber()
  @IsNotEmpty()
  percentage: number;

  @IsBoolean()
  @IsOptional()
  isRetention?: boolean;
}
