import { Module } from '@nestjs/common';
import { ProductPharmasService } from './product-pharmas.service';
import { ProductPharmasController } from './product-pharmas.controller';

@Module({
  controllers: [ProductPharmasController],
  providers: [ProductPharmasService],
})
export class ProductPharmasModule {}
