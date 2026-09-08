import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProductPharmaDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsOptional()
  activeIngredient?: string;

  @IsString()
  @IsOptional()
  laboratory?: string;

  @IsString()
  @IsOptional()
  invimaCode?: string;

  @IsBoolean()
  @IsOptional()
  requiresPrescription?: boolean;

  @IsString()
  @IsOptional()
  concentration?: string;
}
