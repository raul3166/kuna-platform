import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    example: 'cmrxzuv8g0000e76onfchrz1e',
  })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({
    example: 'Administrador',
  })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'ADMIN',
  })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    example: 'Administrador general del sistema',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
