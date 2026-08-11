import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreatePurchaseInvoiceItemDto {
  @IsString()
  @IsNotEmpty()
  purchaseInvoiceId: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  unitCost: number;

  @IsNumber()
  @IsNotEmpty()
  taxRate: number;
}
