import { PartialType } from '@nestjs/swagger';
import { CreateServiceWorkerDto } from './create-service-worker.dto';

export class UpdateServiceWorkerDto extends PartialType(CreateServiceWorkerDto) {}
