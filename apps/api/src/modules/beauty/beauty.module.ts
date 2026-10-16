import { Module } from '@nestjs/common';
import { BeautyController } from './beauty.controller';
import { BeautyService } from './beauty.service';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';

@Module({
  imports: [PrismaModule, ServiceOrdersModule],
  controllers: [BeautyController],
  providers: [BeautyService],
  exports: [BeautyService],
})
export class BeautyModule {}

