import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsNumber()
  salePrice: number;

  @IsNumber()
  costPrice: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsString()
  @IsOptional()
  taxRuleId?: string;
}
