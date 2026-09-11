import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Ajusta la ruta según tu estructura
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { ServiceWorkersService } from './service-workers.service';
import { CreateServiceWorkerDto } from './dto/create-service-worker.dto';
import { UpdateServiceWorkerDto } from './dto/update-service-worker.dto';

@ApiTags('Service Workers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('service-workers')
export class ServiceWorkersController {
  constructor(private readonly serviceWorkersService: ServiceWorkersService) {}

  @Post()
  @Permissions('service-workers.create')
  @ApiOperation({ summary: 'Create a new service worker' })
  @ApiResponse({ status: 201, description: 'Service worker created successfully.' })
  @ApiResponse({ status: 409, description: 'Worker identification already exists in this organization.' })
  create(@Body() createServiceWorkerDto: CreateServiceWorkerDto) {
    return this.serviceWorkersService.create(createServiceWorkerDto);
  }

  @Get()
  @Permissions('service-workers.read')
  @ApiOperation({ summary: 'Get all service workers for an organization' })
  @ApiQuery({ name: 'organizationId', required: true, description: 'Organization ID' })
  findAll(@Query('organizationId') organizationId: string) {
    return this.serviceWorkersService.findAll(organizationId);
  }

  @Get(':id')
  @Permissions('service-workers.read')
  @ApiOperation({ summary: 'Get a specific service worker by ID' })
  @ApiQuery({ name: 'organizationId', required: true, description: 'Organization ID' })
  @ApiResponse({ status: 404, description: 'Service worker not found.' })
  findOne(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.serviceWorkersService.findOne(id, organizationId);
  }

  @Patch(':id')
  @Permissions('service-workers.update')
  @ApiOperation({ summary: 'Update a service worker' })
  @ApiQuery({ name: 'organizationId', required: true, description: 'Organization ID' })
  @ApiResponse({ status: 409, description: 'The identification is already in use by another worker.' })
  update(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() updateServiceWorkerDto: UpdateServiceWorkerDto,
  ) {
    return this.serviceWorkersService.update(id, organizationId, updateServiceWorkerDto);
  }

  @Delete(':id')
  @Permissions('service-workers.delete')
  @ApiOperation({ summary: 'Soft delete a service worker (set isActive to false)' })
  @ApiQuery({ name: 'organizationId', required: true, description: 'Organization ID' })
  remove(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.serviceWorkersService.remove(id, organizationId);
  }

  @Get(':id/commissions')
  @Permissions('service-workers.read')
  @ApiOperation({ summary: 'Get performance and commission summary for a service worker with optional date range' })
  @ApiQuery({ name: 'organizationId', required: true, description: 'Organization ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  getCommissions(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.serviceWorkersService.getWorkerCommissions(
      id,
      organizationId,
      startDate,
      endDate,
    );
  }
}
