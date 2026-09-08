import { PartialType } from '@nestjs/swagger';
import { CreateGymSubscriptionDto } from './create-gym-subscription.dto';

export class UpdateGymSubscriptionDto extends PartialType(CreateGymSubscriptionDto) {}
