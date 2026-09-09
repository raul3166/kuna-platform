import { PartialType } from '@nestjs/swagger';
import { CreateStudioScheduleDto } from './create-studio-schedule.dto';

export class UpdateStudioScheduleDto extends PartialType(CreateStudioScheduleDto) {}
