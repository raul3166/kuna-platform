import { PartialType } from '@nestjs/swagger';
import { CreateBillingResolutionDto } from './create-billing-resolution.dto';

export class UpdateBillingResolutionDto extends PartialType(CreateBillingResolutionDto) {}
