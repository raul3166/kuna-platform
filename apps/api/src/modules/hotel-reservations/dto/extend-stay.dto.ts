import { IsString, IsOptional } from 'class-validator';

export class ExtendStayDto {
  @IsString()
  organizationId: string;

  @IsString()
  newCheckOutDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
