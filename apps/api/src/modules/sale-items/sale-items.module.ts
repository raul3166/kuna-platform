import { Module } from '@nestjs/common';
import { SaleItemsService } from './sale-items.service';
import { SaleItemsController } from './sale-items.controller'; // <-- CORREGIDO EN SINGULAR

@Module({
  controllers: [SaleItemsController], // <-- CORREGIDO EN SINGULAR
  providers: [SaleItemsService],
})
export class SaleItemsModule {}
