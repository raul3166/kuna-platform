import { Module } from '@nestjs/common';
import { StudioPlansService } from './studio-plans.service';
import { StudioPlansController } from './studio-plans.controller';

@Module({
  controllers: [StudioPlansController],
  providers: [StudioPlansService],
})
export class StudioPlansModule {}
