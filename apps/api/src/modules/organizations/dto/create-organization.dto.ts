import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'Restaurante La Casona',
    description: 'Nombre de la organización',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  name!: string;

  @ApiProperty({
    example: 'la-casona',
    description: 'Slug único de la organización',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  slug!: string;

  @ApiProperty({
    example: 'Colombia',
    description: 'País o código del país',
  })
  @IsString()
  @Length(2, 60)
  country!: string;

  @ApiProperty({
    example: 'America/Bogota',
    description: 'Zona horaria de la organización',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
