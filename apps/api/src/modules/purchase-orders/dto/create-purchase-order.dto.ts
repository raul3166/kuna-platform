import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreatePurchaseOrderDto {
  @IsString()
  organizationId: string;

  @IsString()
  branchId: string;

  @IsString()
  supplierId: string;

  @IsString()
  number: string;

  @IsDateString()
  orderDate: string;

  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
