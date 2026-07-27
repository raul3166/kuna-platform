import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
  example: 'cmrxzuv8g0000e76onfchrz1e',
  description: 'Organization identifier',
})
  organizationId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
  example: 'Sucursal Norte',
})
  name: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
  example: 'NOR001',
})
  code: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
  example: 'Carrera 15 #120-50',
})
  address: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
  example: 'Bogotá',
})
  city: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
  example: 'CO',
})
  country: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
  example: '6017654321',
  required: false,
})
  phoneNumber?: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
  example: 'America/Bogota',
})
  timezone: string;
}
