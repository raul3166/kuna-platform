import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({
    example: 'cmprod00000000000000001',
    description: 'Product identifier',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity of items ordered',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: 'Sin cebolla y extra salsa',
    description: 'Item specific preparation notes',
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRestaurantOrderDto {
  @ApiProperty({
    example: 'cmrxzuv8g0000e76onfchrz1e',
    description: 'Organization identifier',
  })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    example: 'cmrzecq840001e7iwwpzi0ins',
    description: 'Branch identifier',
  })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({
    type: [OrderItemDto],
    description: 'List of order items to add to the table',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
