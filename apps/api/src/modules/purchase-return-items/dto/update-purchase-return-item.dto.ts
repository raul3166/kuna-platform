import { PartialType } from '@nestjs/swagger';

import { CreatePurchaseReturnItemDto } from './create-purchase-return-item.dto';

export class UpdatePurchaseReturnItemDto extends PartialType(
  CreatePurchaseReturnItemDto,
) {}
