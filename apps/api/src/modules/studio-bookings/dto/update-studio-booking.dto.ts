import { PartialType } from '@nestjs/swagger';
import { CreateStudioBookingDto } from './create-studio-booking.dto';

export class UpdateStudioBookingDto extends PartialType(CreateStudioBookingDto) {}
