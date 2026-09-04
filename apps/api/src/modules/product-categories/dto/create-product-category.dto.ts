import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductCategoryDto {
  @ApiProperty({ description: 'ID de la organización' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'Nombre de la categoría', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ description: 'Descripción opcional de la categoría', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Indica si los productos de esta categoría manejan inventario/stock', default: true })
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @ApiPropertyOptional({ description: 'Estado activo o inactivo de la categoría', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
