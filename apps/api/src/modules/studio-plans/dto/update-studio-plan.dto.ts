import { PartialType } from '@nestjs/swagger';
import { CreateStudioPlanDto } from './create-studio-plan.dto';

export class UpdateStudioPlanDto extends PartialType(CreateStudioPlanDto) {}
