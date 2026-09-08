import { Module } from '@nestjs/common';
import { ProductLotsService } from './product-lots.service';
import { ProductLotsController } from './product-lots.controller';

@Module({
  controllers: [ProductLotsController],
  providers: [ProductLotsService],
})
export class ProductLotsModule {}
