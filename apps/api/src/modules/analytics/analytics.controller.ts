import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
// Cambiamos la referencia de importación
import { DashboardKpiQueryDto } from './dto/create-analytics.dto';
import { SalesPerformanceQueryDto } from './dto/sales-performance-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { TopSellersQueryDto } from './dto/top-sellers-query.dto';

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Obtener métricas ejecutivas de ventas (KPIs)' })
  @ApiResponse({ status: 200, description: 'KPIs analíticos generados con éxito.' })
  @Permissions('analytics.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('dashboard-kpis')
  getDashboardKPIs(@Query() query: DashboardKpiQueryDto) {
    return this.analyticsService.getDashboardKPIs(query);
  }

  @ApiOperation({ summary: 'Obtener métricas ejecutivas de ventas (Sales & Performance)' })
  @ApiResponse({ status: 200, description: 'KPIs analíticos generados con éxito.' })
  @Permissions('analytics.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('sales-performance')
  async getSalesPerformance(@Query() query: SalesPerformanceQueryDto) {
    return this.analyticsService.getSalesPerformanceReport(query);
  }

// ... dentro de la clase AnalyticsController

@ApiOperation({ summary: 'Obtener ranking de productos más vendidos' })
@Permissions('analytics.read')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Get('top-sellers')
async getTopSellers(@Query() query: TopSellersQueryDto) {
  return this.analyticsService.getTopSellers(query);
}

@ApiOperation({ summary: 'Obtener analítica de rotación de inventario' })
@Permissions('analytics.read')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Get('inventory-turnover')
async getInventoryTurnover(@Query() query: TopSellersQueryDto) {
  return this.analyticsService.getInventoryTurnover(query);
}
}
