import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

import { InventoryMovementType } from '@prisma/client';

export class CreateInventoryMovementDto {
  @IsString()
  organizationId: string;

  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsEnum(InventoryMovementType)
  movementType: InventoryMovementType;

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
