import { Module } from '@nestjs/common';
import { PurchaseReturnItemsService } from './purchase-return-items.service';
import { PurchaseReturnItemsController } from './purchase-return-items.controller';

@Module({
  controllers: [PurchaseReturnItemsController],
  providers: [PurchaseReturnItemsService],
})
export class PurchaseReturnItemsModule {}
