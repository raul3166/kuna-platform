import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';

export class UpdateVerticalConfigDto {
  @ApiProperty({
    example: { requiresOdometer: true, defaultWarrantyDays: 30 },
    description: 'Configuración personalizada del vertical para la organización en formato JSON',
  })
  @IsObject()
  @IsNotEmpty()
  config: Record<string, any>;
}

