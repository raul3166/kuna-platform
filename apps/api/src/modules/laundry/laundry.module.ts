import { Module } from '@nestjs/common';
import { LaundryService } from './laundry.service';
import { LaundryController } from './laundry.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { VerticalsModule } from '../verticals/verticals.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';

@Module({
  imports: [PrismaModule, VerticalsModule, ServiceOrdersModule],
  controllers: [LaundryController],
  providers: [LaundryService],
  exports: [LaundryService],
})
export class LaundryModule {}

