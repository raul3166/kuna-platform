import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class ToggleVerticalDto {
  @ApiProperty({
    example: 'HOTEL',
    description: 'Código del vertical a activar o desactivar',
  })
  @IsString()
  @IsNotEmpty()
  verticalCode: string;

  @ApiProperty({
    example: true,
    description: 'Estado de activación del vertical para la organización',
  })
  @IsBoolean()
  isActive: boolean;
}

