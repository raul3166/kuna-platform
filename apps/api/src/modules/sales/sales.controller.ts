import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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

import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SalesService } from './sales.service';

@ApiTags('Sales')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @Permissions('sales.create')
  @ApiOperation({ summary: 'Create a new sale header in DRAFT state' })
  @ApiResponse({ status: 201, description: 'Sale header created successfully.' })
  @ApiResponse({ status: 409, description: 'Sale number already exists in this organization.' })
  async create(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.create(createSaleDto);
  }

  @Get()
  @Permissions('sales.read')
  @ApiOperation({ summary: 'Get all sales headers' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'CONFIRMED', 'CANCELLED'] })
  async findAll(
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: string,
  ) {
    return this.salesService.findAll(organizationId, status);
  }

  @Get(':id')
  @Permissions('sales.read')
  @ApiOperation({ summary: 'Get a specific sale header by ID' })
  @ApiResponse({ status: 404, description: 'Sale not found.' })
  async findOne(@Param('id') id: string) {
    return this.salesService.findOne(id);
  }

  @Patch(':id')
  @Permissions('sales.update')
  @ApiOperation({ summary: 'Update a DRAFT sale header' })
  @ApiResponse({ status: 409, description: 'Only DRAFT sales can be modified.' })
  async update(@Param('id') id: string, @Body() updateSaleDto: UpdateSaleDto) {
    return this.salesService.update(id, updateSaleDto);
  }

  @Delete(':id')
  @Permissions('sales.delete')
  @ApiOperation({ summary: 'Delete a DRAFT sale header' })
  @ApiResponse({ status: 409, description: 'Only DRAFT sales can be deleted.' })
  async remove(@Param('id') id: string) {
    return this.salesService.remove(id);
  }

  @Patch(':id/confirm')
  @Permissions('sales.update')
  @ApiOperation({ summary: 'Confirm and seal a sale header' })
  async confirm(@Param('id') id: string) {
    return this.salesService.confirm(id);
  }

  @Patch(':id/cancel')
  @Permissions('sales.update')
  @ApiOperation({ summary: 'Cancel a draft sale header' })
  async cancel(@Param('id') id: string) {
    return this.salesService.cancel(id);
  }
}
