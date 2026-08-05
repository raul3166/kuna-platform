import { Module } from '@nestjs/common';
import { GoodsReceiptItemsService } from './goods-receipt-items.service';
import { GoodsReceiptItemsController } from './goods-receipt-items.controller';

@Module({
  controllers: [GoodsReceiptItemsController],
  providers: [GoodsReceiptItemsService],
})
export class GoodsReceiptItemsModule {}
