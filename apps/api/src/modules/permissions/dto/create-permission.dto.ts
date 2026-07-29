import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'users',
  })
  @IsString()
  @IsNotEmpty()
  module: string;

  @ApiProperty({
    example: 'users.create',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    example: 'Create users',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'Allows creating users',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
