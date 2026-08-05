import {
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { Type } from 'class-transformer';

export class CreatePurchaseOrderItemDto {
  @IsString()
  purchaseOrderId: string;

  @IsString()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  unitCost: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
