import { IsString, IsNotEmpty, IsOptional, IsNumber, IsPositive } from 'class-validator';

export class CreateServiceOrderTaskDto {
  @IsString()
  @IsNotEmpty()
  serviceOrderId: string;

  @IsString()
  @IsOptional()
  serviceItemId?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  assignedWorkerId?: string;

  @IsNumber()
  @IsPositive()
  price: number;
}
