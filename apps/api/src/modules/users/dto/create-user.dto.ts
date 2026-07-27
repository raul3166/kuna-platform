import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
  example: 'cmry123456789',
  description: 'Organization identifier',
})
@IsNotEmpty()
  @IsString()
  organizationId: string;

  @ApiProperty({
  example: 'cmry987654321',
  description: 'Branch identifier',
})
  @IsNotEmpty()
  @IsString()
  branchId: string;

  @ApiProperty({
  example: 'Raúl',
})
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({
  example: 'Ramírez',
})
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({
  example: 'raul@kuna.com',
})
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({
  example: 'MiPassword123',
  minLength: 8,
})
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
  example: '+573001112233',
})
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
