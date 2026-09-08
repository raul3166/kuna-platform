import { Module } from '@nestjs/common';
import { GymSubscriptionsService } from './gym-subscriptions.service';
import { GymSubscriptionsController } from './gym-subscriptions.controller';

@Module({
  controllers: [GymSubscriptionsController],
  providers: [GymSubscriptionsService],
})
export class GymSubscriptionsModule {}
