import { Module } from '@nestjs/common';
import { SaleReturnItemsService } from './sale-return-items.service';
import { SaleReturnItemsController } from './sale-return-items.controller';

@Module({
  controllers: [SaleReturnItemsController],
  providers: [SaleReturnItemsService],
})
export class SaleReturnItemsModule {}
