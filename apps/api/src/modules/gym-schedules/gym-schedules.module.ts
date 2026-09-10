import { Module } from '@nestjs/common';
import { GymSchedulesController } from './gym-schedules.controller';
import { GymSchedulesService } from './gym-schedules.service';

@Module({
  controllers: [GymSchedulesController],
  providers: [GymSchedulesService],
  exports: [GymSchedulesService],
})
export class GymSchedulesModule {}

