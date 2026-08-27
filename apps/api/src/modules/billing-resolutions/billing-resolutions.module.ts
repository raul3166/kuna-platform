import { Module } from '@nestjs/common';
import { BillingResolutionsService } from './billing-resolutions.service';
import { BillingResolutionsController } from './billing-resolutions.controller';

@Module({
  controllers: [BillingResolutionsController],
  providers: [BillingResolutionsService],
})
export class BillingResolutionsModule {}
