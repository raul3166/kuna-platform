import { Module } from '@nestjs/common';
import { StudioSchedulesService } from './studio-schedules.service';
import { StudioSchedulesController } from './studio-schedules.controller';

@Module({
  controllers: [StudioSchedulesController],
  providers: [StudioSchedulesService],
})
export class StudioSchedulesModule {}
