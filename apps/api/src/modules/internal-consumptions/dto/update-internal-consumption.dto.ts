import { PartialType } from '@nestjs/swagger';
import { CreateInternalConsumptionDto } from './create-internal-consumption.dto';

export class UpdateInternalConsumptionDto extends PartialType(CreateInternalConsumptionDto) {}
