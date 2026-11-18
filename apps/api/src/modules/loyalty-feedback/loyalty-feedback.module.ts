import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { LoyaltyFeedbackController } from './loyalty-feedback.controller';
import { LoyaltyFeedbackService } from './loyalty-feedback.service';

@Module({
  imports: [PrismaModule],
  controllers: [LoyaltyFeedbackController],
  providers: [LoyaltyFeedbackService],
  exports: [LoyaltyFeedbackService],
})
export class LoyaltyFeedbackModule {}

