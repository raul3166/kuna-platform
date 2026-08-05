import { Type } from 'class-transformer';
import {
  IsNumber,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateGoodsReceiptItemDto {
  @IsString()
  goodsReceiptId: string;

  @IsString()
  purchaseOrderItemId: string;

  @IsString()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantityReceived: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
