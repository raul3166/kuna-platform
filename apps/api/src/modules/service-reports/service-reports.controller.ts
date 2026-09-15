import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { ServiceReportsService } from './service-reports.service';

@ApiTags('Service Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('service-reports')
export class ServiceReportsController {
  constructor(private readonly serviceReportsService: ServiceReportsService) {}

  @Get('revenue')
  @Permissions('service-orders.read')
  @ApiOperation({ summary: 'Get revenue and financial summary of service orders' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getRevenueReport(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.serviceReportsService.getRevenueReport(organizationId, branchId, startDate, endDate);
  }

  @Get('commissions')
  @Permissions('service-orders.read')
  @ApiOperation({ summary: 'Get worker commissions and labor settlement report' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'workerId', required: false })
  getCommissionsReport(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('workerId') workerId?: string,
  ) {
    return this.serviceReportsService.getCommissionsReport(
      organizationId,
      branchId,
      startDate,
      endDate,
      workerId,
    );
  }

  @Get('material-consumption')
  @Permissions('service-orders.read')
  @ApiOperation({ summary: 'Get material consumption audit records linked to services' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getMaterialConsumption(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.serviceReportsService.getMaterialConsumptionReport(organizationId, branchId, startDate, endDate);
  }
}
