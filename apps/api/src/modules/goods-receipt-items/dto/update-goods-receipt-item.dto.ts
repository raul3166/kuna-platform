import { PartialType } from '@nestjs/swagger';

import { CreateGoodsReceiptItemDto } from './create-goods-receipt-item.dto';

export class UpdateGoodsReceiptItemDto extends PartialType(
  CreateGoodsReceiptItemDto,
) {}
