import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateGoodsReceiptDto {
  @IsString()
  organizationId: string;

  @IsString()
  purchaseOrderId: string;

  @IsString()
  number: string;

  @IsDateString()
  receivedDate: string;

  @IsOptional()
  @IsString()
  receivedById?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
