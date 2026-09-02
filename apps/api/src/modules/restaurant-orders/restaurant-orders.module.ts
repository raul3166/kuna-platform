import { Module } from '@nestjs/common';
import { RestaurantOrdersService } from './restaurant-orders.service';
import { RestaurantOrdersController } from './restaurant-orders.controller';

@Module({
  controllers: [RestaurantOrdersController],
  providers: [RestaurantOrdersService],
})
export class RestaurantOrdersModule {}
