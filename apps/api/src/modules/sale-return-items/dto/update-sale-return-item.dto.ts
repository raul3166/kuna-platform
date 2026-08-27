import { PartialType } from '@nestjs/swagger';
import { CreateSaleReturnItemDto } from './create-sale-return-item.dto';

export class UpdateSaleReturnItemDto extends PartialType(CreateSaleReturnItemDto) {}
