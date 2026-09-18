import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

export class InternalConsumptionItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class CreateInternalConsumptionDto {
  @IsString()
  organizationId: string;

  @IsString()
  branchId: string;

  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InternalConsumptionItemDto)
  items: InternalConsumptionItemDto[];
}
