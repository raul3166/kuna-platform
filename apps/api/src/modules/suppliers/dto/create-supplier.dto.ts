import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty()
  @IsString()
  organizationId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(150)
  companyName: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @ApiProperty()
  @IsString()
  identificationType: string;

  @ApiProperty()
  @IsString()
  identificationNumber: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
