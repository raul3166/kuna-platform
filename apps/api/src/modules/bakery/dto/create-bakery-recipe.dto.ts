import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BakeryRecipeIngredientInputDto {
  @IsString()
  @IsNotEmpty()
  ingredientProductId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateBakeryRecipeDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  @IsNotEmpty()
  finishedProductId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  yieldQuantity: number;

  @IsOptional()
  @IsString()
  yieldUnit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  prepMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  bakeMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ovenTempC?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  shelfLifeDays?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BakeryRecipeIngredientInputDto)
  ingredients: BakeryRecipeIngredientInputDto[];
}

