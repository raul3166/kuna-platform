import { PartialType } from '@nestjs/swagger';
import { CreateGymMembershipPlanDto } from './create-gym-membership-plan.dto';

export class UpdateGymMembershipPlanDto extends PartialType(CreateGymMembershipPlanDto) {}
