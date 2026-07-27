import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
  example: 'Sucursal Norte Remodelada',
})
  name?: string;

  @IsOptional()
  @IsString()
    @ApiPropertyOptional({
    example: 'NOR001',
  })
  code?: string;

  @IsOptional()
  @IsString()
    @ApiPropertyOptional({
    example: 'Carrera 15 #120-50',
  })
  address?: string;

  @IsOptional()
  @IsString()
   @ApiPropertyOptional({
    example: 'Bogotá',
  })
  city?: string;

  @IsOptional()
  @IsString()
    @ApiPropertyOptional({
    example: 'CO',
  })
  country?: string;

  @IsOptional()
  @IsString()
    @ApiPropertyOptional({
    example: '6017654321',
    required: false,
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
    @ApiPropertyOptional({
    example: 'America/Bogota',
  })
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
