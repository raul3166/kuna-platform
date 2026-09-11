import { PartialType } from '@nestjs/swagger';
import { CreateServiceOrderMaterialDto } from './create-service-order-material.dto';

export class UpdateServiceOrderMaterialDto extends PartialType(CreateServiceOrderMaterialDto) {}
