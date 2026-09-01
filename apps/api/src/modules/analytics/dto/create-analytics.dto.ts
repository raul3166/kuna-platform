import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardKpiQueryDto {
  @ApiPropertyOptional({ description: 'ID de la organización' })
  @IsString()
  organizationId: string;

  @ApiPropertyOptional({ description: 'Filtrar por sucursal específica' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Fecha inicio (ISOString format)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha fin (ISOString format)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
