import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

export class CreatePurchaseReturnDto {
  @ApiProperty()
  @IsString()
  organizationId: string;

  @ApiProperty()
  @IsString()
  supplierId: string;

  @ApiProperty()
  @IsString()
  purchaseOrderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  goodsReceiptId?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  number: string;

  @ApiProperty({
    example: '2026-08-11T00:00:00.000Z',
  })
  @IsDateString()
  returnDate: string;

  @ApiPropertyOptional({
    example: 'Producto defectuoso',
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
