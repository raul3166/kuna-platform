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
import { ServiceOrderStatus } from '@prisma/client';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { ServiceOrdersService } from './service-orders.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';

@ApiTags('Service Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post()
  @Permissions('service-orders.create')
  @ApiOperation({ summary: 'Create a new service order in PENDING state' })
  @ApiResponse({ status: 201, description: 'Service order created successfully.' })
  create(@Body() createServiceOrderDto: CreateServiceOrderDto) {
    return this.serviceOrdersService.create(createServiceOrderDto);
  }

  @Get()
  @Permissions('service-orders.read')
  @ApiOperation({ summary: 'Get all service orders headers with tasks and materials' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiQuery({ name: 'status', required: false, enum: ServiceOrderStatus })
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('status') status?: ServiceOrderStatus,
  ) {
    return this.serviceOrdersService.findAll(organizationId, status);
  }

  @Get(':id')
  @Permissions('service-orders.read')
  @ApiOperation({ summary: 'Get a specific service order by ID with tasks and materials' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({ status: 404, description: 'Service order not found.' })
  findOne(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.serviceOrdersService.findOne(id, organizationId);
  }

  @Patch(':id')
  @Permissions('service-orders.update')
  @ApiOperation({ summary: 'Update a PENDING service order' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({ status: 409, description: 'Only PENDING orders can be modified.' })
  update(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() updateServiceOrderDto: UpdateServiceOrderDto,
  ) {
    return this.serviceOrdersService.update(id, organizationId, updateServiceOrderDto);
  }

  @Delete(':id')
  @Permissions('service-orders.delete')
  @ApiOperation({ summary: 'Delete a PENDING service order' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({ status: 409, description: 'Only PENDING orders can be deleted.' })
  remove(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.serviceOrdersService.remove(id, organizationId);
  }

  @Patch(':id/in-progress')
  @Permissions('service-orders.update')
  @ApiOperation({ summary: 'Change order status to IN_PROGRESS' })
  @ApiQuery({ name: 'organizationId', required: true })
  markInProgress(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.serviceOrdersService.updateStatus(id, organizationId, ServiceOrderStatus.IN_PROGRESS);
  }

  @Patch(':id/waiting-parts')
  @Permissions('service-orders.update')
  @ApiOperation({ summary: 'Change order status to WAITING_PARTS' })
  @ApiQuery({ name: 'organizationId', required: true })
  markWaitingParts(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.serviceOrdersService.updateStatus(id, organizationId, ServiceOrderStatus.WAITING_PARTS);
  }

  @Patch(':id/complete')
  @Permissions('service-orders.update')
  @ApiOperation({ summary: 'Change order status to COMPLETED' })
  @ApiQuery({ name: 'organizationId', required: true })
  complete(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.serviceOrdersService.updateStatus(id, organizationId, ServiceOrderStatus.COMPLETED);
  }

  @Patch(':id/bill')
  @Permissions('service-orders.update')
  @ApiOperation({ summary: 'Change order status to BILLED' })
  @ApiQuery({ name: 'organizationId', required: true })
  bill(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.serviceOrdersService.updateStatus(id, organizationId, ServiceOrderStatus.BILLED);
  }

  @Patch(':id/cancel')
  @Permissions('service-orders.update')
  @ApiOperation({ summary: 'Change order status to CANCELLED' })
  @ApiQuery({ name: 'organizationId', required: true })
  cancel(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.serviceOrdersService.updateStatus(id, organizationId, ServiceOrderStatus.CANCELLED);
  }
}
