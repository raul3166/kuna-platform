import {
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class CreatePurchaseReturnItemDto {
  @ApiProperty()
  @IsString()
  purchaseReturnId: string;

  @ApiProperty()
  @IsString()
  goodsReceiptItemId: string;

  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({
    example: '2',
  })
  @IsNumberString()
  quantity: string;

  @ApiProperty({
    example: '18000',
  })
  @IsNumberString()
  unitCost: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
