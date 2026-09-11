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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { ServiceItemsService } from './service-items.service';
import { CreateServiceItemDto } from './dto/create-service-item.dto';
import { UpdateServiceItemDto } from './dto/update-service-item.dto';

@ApiTags('Service Items')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('service-items')
export class ServiceItemsController {
  constructor(private readonly serviceItemsService: ServiceItemsService) {}

  @Post()
  @Permissions('service-items.create')
  @ApiOperation({ summary: 'Create a new service item' })
  @ApiResponse({ status: 201, description: 'Service item created successfully.' })
  @ApiResponse({ status: 409, description: 'Service name already exists in this organization.' })
  create(@Body() createServiceItemDto: CreateServiceItemDto) {
    return this.serviceItemsService.create(createServiceItemDto);
  }

  @Get()
  @Permissions('service-items.read')
  @ApiOperation({ summary: 'Get all service items for an organization' })
  @ApiQuery({ name: 'organizationId', required: true, description: 'Organization ID' })
  findAll(@Query('organizationId') organizationId: string) {
    return this.serviceItemsService.findAll(organizationId);
  }

  @Get(':id')
  @Permissions('service-items.read')
  @ApiOperation({ summary: 'Get a specific service item by ID' })
  @ApiQuery({ name: 'organizationId', required: true, description: 'Organization ID' })
  @ApiResponse({ status: 404, description: 'Service item not found.' })
  findOne(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.serviceItemsService.findOne(id, organizationId);
  }

  @Patch(':id')
  @Permissions('service-items.update')
  @ApiOperation({ summary: 'Update a service item' })
  @ApiQuery({ name: 'organizationId', required: true, description: 'Organization ID' })
  @ApiResponse({ status: 409, description: 'The name is already in use by another service.' })
  update(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() updateServiceItemDto: UpdateServiceItemDto,
  ) {
    return this.serviceItemsService.update(id, organizationId, updateServiceItemDto);
  }

  @Delete(':id')
  @Permissions('service-items.delete')
  @ApiOperation({ summary: 'Soft delete a service item (set isActive to false)' })
  @ApiQuery({ name: 'organizationId', required: true, description: 'Organization ID' })
  remove(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.serviceItemsService.remove(id, organizationId);
  }
}
