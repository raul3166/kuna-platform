import { Module } from '@nestjs/common';
import { PurchaseInvoiceItemsService } from './purchase-invoice-items.service';
import { PurchaseInvoiceItemsController } from './purchase-invoice-items.controller';

@Module({
  controllers: [PurchaseInvoiceItemsController],
  providers: [PurchaseInvoiceItemsService],
})
export class PurchaseInvoiceItemsModule {}
