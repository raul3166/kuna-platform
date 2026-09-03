import { IsEnum, IsNotEmpty } from 'class-validator';
import { KitchenStatus } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsNotEmpty()
  @IsEnum(KitchenStatus)
  status!: KitchenStatus;
}
