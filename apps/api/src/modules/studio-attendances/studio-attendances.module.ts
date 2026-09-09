import { Module } from '@nestjs/common';
import { StudioAttendancesService } from './studio-attendances.service';
import { StudioAttendancesController } from './studio-attendances.controller';

@Module({
  controllers: [StudioAttendancesController],
  providers: [StudioAttendancesService],
})
export class StudioAttendancesModule {}
