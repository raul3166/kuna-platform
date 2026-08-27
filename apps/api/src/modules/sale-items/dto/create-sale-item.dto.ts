import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSaleItemDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'cmtbkcgt2000be75glg8sv936',
    description: 'Sale identifier',
  })
  saleId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: 'cmt8tnrdx0001e78k13zj5x1w',
    description: 'Product identifier',
  })
  productId: string;

  @IsNumber()
  @IsPositive()
  @ApiProperty({
    example: 10,
    description: 'Quantity sold',
  })
  quantity: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({
    example: 5500,
    description: 'Unit sale price',
  })
  unitPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({
    example: 0,
    description: 'Discount applied to the item',
    default: 0,
  })
  discount?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    example: 'Arroz blanco 500g',
  })
  description?: string;
}
