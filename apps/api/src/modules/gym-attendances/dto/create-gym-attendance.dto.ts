import { IsString } from 'class-validator';

export class CreateGymAttendanceDto {
  @IsString()
  organizationId: string;

  @IsString()
  branchId: string;

  @IsString()
  documentNumber: string;
}
