import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

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
    example: 'CO',
    description: 'Código del país',
  })
  @IsString()
  @Length(2, 2)
  country!: string;
}
