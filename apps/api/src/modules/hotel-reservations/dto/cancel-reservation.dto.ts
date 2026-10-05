import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CancelReservationDto {
  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsNumber()
  cancellationCharge?: number;
}
