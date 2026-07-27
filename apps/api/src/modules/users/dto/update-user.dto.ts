import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
    @ApiPropertyOptional({
    example: 'Raúl',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

    @ApiPropertyOptional({
    example: 'Ramírez',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

    @ApiPropertyOptional({
    example: 'raul@kuna.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

    @ApiPropertyOptional({
    example: 'MiPassword123',
    minLength: 8,
  })
  @IsOptional()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
  example: '+573001112233',
})
  @IsOptional()
  @IsString()
  phoneNumber?: string;

    @ApiPropertyOptional({
    example: 'cmry987654321',
    description: 'Branch identifier',
  })
  @IsOptional()
  branchId?: string;
}
