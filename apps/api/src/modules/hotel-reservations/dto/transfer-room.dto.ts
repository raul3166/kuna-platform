import { IsString, IsOptional } from 'class-validator';

export class TransferRoomDto {
  @IsString()
  organizationId: string;

  @IsString()
  newRoomId: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
