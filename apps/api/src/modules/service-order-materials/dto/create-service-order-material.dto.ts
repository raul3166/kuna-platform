import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class CreateServiceOrderMaterialDto {
  @IsString()
  @IsNotEmpty()
  serviceOrderId: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @IsNumber()
  @IsPositive()
  unitCost: number;
}
