import { PartialType } from '@nestjs/swagger';
import { CreateProductLotDto } from './create-product-lot.dto';

export class UpdateProductLotDto extends PartialType(CreateProductLotDto) {}
