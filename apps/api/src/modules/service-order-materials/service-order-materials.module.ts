import { Module } from '@nestjs/common';
import { ServiceOrderMaterialsService } from './service-order-materials.service';
import { ServiceOrderMaterialsController } from './service-order-materials.controller';

@Module({
  controllers: [ServiceOrderMaterialsController],
  providers: [ServiceOrderMaterialsService],
})
export class ServiceOrderMaterialsModule {}
