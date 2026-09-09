import { Module } from '@nestjs/common';
import { StudioBookingsService } from './studio-bookings.service';
import { StudioBookingsController } from './studio-bookings.controller';

@Module({
  controllers: [StudioBookingsController],
  providers: [StudioBookingsService],
})
export class StudioBookingsModule {}
