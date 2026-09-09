import { PartialType } from '@nestjs/swagger';
import { CreateStudioAttendanceDto } from './create-studio-attendance.dto';

export class UpdateStudioAttendanceDto extends PartialType(CreateStudioAttendanceDto) {}
