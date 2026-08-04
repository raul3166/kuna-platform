import {
  IsString,
  IsOptional,
  IsNumberString,
} from 'class-validator';

export class CreateInventoryMovementDto {
  @IsString()
  organizationId: string;

  @IsString()
  productId: string;

  @IsString()
  movementType: string;

  @IsNumberString()
  quantity: string;

  @IsOptional()
  @IsNumberString()
  unitCost?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
