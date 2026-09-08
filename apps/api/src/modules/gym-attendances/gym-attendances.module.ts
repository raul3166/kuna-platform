import { Module } from '@nestjs/common';
import { GymAttendancesService } from './gym-attendances.service';
import { GymAttendancesController } from './gym-attendances.controller';

@Module({
  controllers: [GymAttendancesController],
  providers: [GymAttendancesService],
})
export class GymAttendancesModule {}
