import { Module } from '@nestjs/common';
import { StudioSubscriptionsService } from './studio-subscriptions.service';
import { StudioSubscriptionsController } from './studio-subscriptions.controller';

@Module({
  controllers: [StudioSubscriptionsController],
  providers: [StudioSubscriptionsService],
})
export class StudioSubscriptionsModule {}
