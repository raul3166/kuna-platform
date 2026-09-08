import { Module } from '@nestjs/common';
import { GymMembershipPlansService } from './gym-membership-plans.service';
import { GymMembershipPlansController } from './gym-membership-plans.controller';

@Module({
  controllers: [GymMembershipPlansController],
  providers: [GymMembershipPlansService],
})
export class GymMembershipPlansModule {}
