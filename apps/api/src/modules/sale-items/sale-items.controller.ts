import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { SaleItemsService } from './sale-items.service'; // Inyección limpia sin la S
import { CreateSaleItemDto } from './dto/create-sale-item.dto';
import { UpdateSaleItemDto } from './dto/update-sale-item.dto';

@ApiTags('Sale Items')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sale-items')
export class SaleItemsController {
  // CORREGIDO: Inyección en singular del servicio de la carpeta
  constructor(private readonly saleItemsService: SaleItemsService) {}

  @ApiOperation({
    summary: 'Add an item to a draft sale',
  })
  @ApiResponse({
    status: 201,
    description: 'Sale item created successfully and header totals recalculated.',
  })
  @ApiResponse({
    status: 404,
    description: 'Sale header or product not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Items can only be added to draft sales.',
  })
  @Post()
  @Permissions('sale-items.create') // Permiso granular específico
  async create(@Body() createSaleItemDto: CreateSaleItemDto) {
    return this.saleItemsService.create(createSaleItemDto);
  }

  @ApiOperation({
    summary: 'Get all sale items',
  })
  @ApiResponse({
    status: 200,
    description: 'List of all sale items.',
  })
  @Get()
  @Permissions('sale-items.read') // Permiso granular específico
  async findAll() {
    // Si tu servicio requiere la lógica de listado plano general
    return this.saleItemsService.findAll();
  }

  @ApiOperation({
    summary: 'Get sale item by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Sale item found.',
  })
  @ApiResponse({
    status: 404,
    description: 'Sale item not found.',
  })
  @Get(':id')
  @Permissions('sale-items.read') // Permiso granular específico
  async findOne(@Param('id') id: string) {
    return this.saleItemsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update a sale item within a draft sale',
  })
  @ApiResponse({
    status: 200,
    description: 'Sale item updated successfully and header updated.',
  })
  @ApiResponse({
    status: 404,
    description: 'Sale item not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Items can only be modified on draft sales.',
  })
  @Patch(':id')
  @Permissions('sale-items.update') // Permiso granular específico
  async update(
    @Param('id') id: string,
    @Body() updateSaleItemDto: UpdateSaleItemDto,
  ) {
    return this.saleItemsService.update(id, updateSaleItemDto);
  }

  @ApiOperation({
    summary: 'Remove an item from a draft sale',
  })
  @ApiResponse({
    status: 200,
    description: 'Sale item deleted successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Sale item not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Items can only be removed from draft sales.',
  })
  @Delete(':id')
  @Permissions('sale-items.delete') // Permiso granular específico
  async remove(@Param('id') id: string) {
    return this.saleItemsService.remove(id);
  }
}
