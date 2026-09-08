import { IsDateString, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateProductLotDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  lotNumber: string;

  @IsDateString()
  @IsNotEmpty()
  expirationDate: string;

  @IsNumber()
  @Min(0)
  stock: number;
}
