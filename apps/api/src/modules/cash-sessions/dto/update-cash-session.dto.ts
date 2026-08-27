import { PartialType } from '@nestjs/swagger';
import { CreateCashSessionDto } from './create-cash-session.dto';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateCashSessionDto extends PartialType(CreateCashSessionDto) {
  @IsNumber()
  @Min(0)
  actualBalance?: number; // Campo mandatorio para registrar el arqueo físico
}
