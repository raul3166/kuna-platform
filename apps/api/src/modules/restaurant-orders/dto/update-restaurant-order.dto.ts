import { PartialType } from '@nestjs/swagger';
import { CreateRestaurantOrderDto } from './create-restaurant-order.dto';

export class UpdateRestaurantOrderDto extends PartialType(CreateRestaurantOrderDto) {}
