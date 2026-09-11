import { PartialType } from '@nestjs/swagger';
import { CreateServiceOrderTaskDto } from './create-service-order-task.dto';

export class UpdateServiceOrderTaskDto extends PartialType(CreateServiceOrderTaskDto) {}
