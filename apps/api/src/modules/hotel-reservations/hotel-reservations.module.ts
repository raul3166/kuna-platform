import { Module } from '@nestjs/common';
import { HotelReservationsService } from './hotel-reservations.service';
import { HotelReservationsController } from './hotel-reservations.controller';

@Module({
  controllers: [HotelReservationsController],
  providers: [HotelReservationsService],
})
export class HotelReservationsModule {}
