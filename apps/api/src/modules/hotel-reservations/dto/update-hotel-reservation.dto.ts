import { PartialType } from '@nestjs/swagger';
import { CreateHotelReservationDto } from './create-hotel-reservation.dto';

export class UpdateHotelReservationDto extends PartialType(CreateHotelReservationDto) {}
