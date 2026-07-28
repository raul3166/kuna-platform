import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'raul@kuna.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'MiPassword123',
  })
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
