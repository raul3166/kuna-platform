import { PartialType } from '@nestjs/swagger';
import { CreateStudioSubscriptionDto } from './create-studio-subscription.dto';

export class UpdateStudioSubscriptionDto extends PartialType(CreateStudioSubscriptionDto) {}
