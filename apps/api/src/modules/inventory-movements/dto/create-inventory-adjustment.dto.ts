import {
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateInventoryAdjustmentDto {
  @IsString()
  organizationId: string;

  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsNumberString()
  quantity: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
