import { IsString, IsNotEmpty, IsInt, Min, IsEnum, IsOptional } from 'class-validator';
import { TableStatus } from '@prisma/client';

export class CreateTableDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  tableNumber: string;

  @IsInt()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;
}
