import { PartialType } from '@nestjs/swagger';
import { CreateGymAttendanceDto } from './create-gym-attendance.dto';

export class UpdateGymAttendanceDto extends PartialType(CreateGymAttendanceDto) {}
