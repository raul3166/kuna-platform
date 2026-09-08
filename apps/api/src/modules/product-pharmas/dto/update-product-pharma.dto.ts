import { PartialType } from '@nestjs/swagger';
import { CreateProductPharmaDto } from './create-product-pharma.dto';

export class UpdateProductPharmaDto extends PartialType(CreateProductPharmaDto) {}
