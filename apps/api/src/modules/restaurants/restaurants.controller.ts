import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RestaurantsService } from './restaurants.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateRoomDto, UpdateTableDto } from './dto/update-restaurant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { TableStatus } from '@prisma/client';

@ApiTags('Restaurant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @ApiOperation({ summary: 'Obtener salones con sus mesas para una sucursal' })
  @Permissions('restaurant.read')
  @Get('rooms')
  async getRoomsByBranch(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId: string,
  ) {
    return this.restaurantsService.getRoomsByBranch(organizationId, branchId);
  }

  @ApiOperation({ summary: 'Crear un nuevo salón / ambiente' })
  @Permissions('restaurant.create')
  @Post('rooms')
  async createRoom(@Body() dto: CreateRoomDto) {
    return this.restaurantsService.createRoom(dto);
  }

  @ApiOperation({ summary: 'Crear una mesa dentro de un salón' })
  @Permissions('restaurant.create')
  @Post('tables')
  async createTable(@Body() dto: CreateTableDto) {
    return this.restaurantsService.createTable(dto);
  }

  @ApiOperation({ summary: 'Actualizar el estado de una mesa (Ocupar, Liberar, Reservar)' })
  @Permissions('restaurant.update')
  @Patch('tables/:id/status')
  async updateTableStatus(
    @Param('id') id: string,
    @Body('status') status: TableStatus,
    @Body('currentSaleId') currentSaleId?: string,
  ) {
    return this.restaurantsService.updateTableStatus(id, status);
  }


// ... dentro de class RestaurantsController

  @ApiOperation({ summary: 'Editar configuración de un salón' })
  @Permissions('restaurant.update')
  @Patch('rooms/:id')
  async updateRoom(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.restaurantsService.updateRoom(id, dto);
  }

  @ApiOperation({ summary: 'Editar datos de una mesa (capacidad, número, salón)' })
  @Permissions('restaurant.update')
  @Patch('tables/:id')
  async updateTable(@Param('id') id: string, @Body() dto: UpdateTableDto) {
    return this.restaurantsService.updateTable(id, dto);
  }

  @ApiOperation({ summary: 'Aperturar una mesa' })
  @Permissions('restaurant.update')
  @Patch('tables/:id/open')
  async openTable(
    @Param('id') id: string,
    @Body('saleId') saleId?: string,
  ) {
    return this.restaurantsService.updateTableStatus(id, TableStatus.OCCUPIED);
  }

  @ApiOperation({ summary: 'Solicitar o imprimir pre-cuenta' })
  @Permissions('restaurant.update')
  @Patch('tables/:id/bill-printed')
  async setBillPrinted(@Param('id') id: string) {
    return this.restaurantsService.setBillPrinted(id);
  }

  @ApiOperation({ summary: 'Liberar una mesa (manual o sin consumo)' })
  @Permissions('restaurant.update')
  @Patch('tables/:id/release')
  async releaseTable(@Param('id') id: string) {
return this.restaurantsService.updateTableStatus(id, TableStatus.AVAILABLE, null);
}

@ApiOperation({ summary: 'Obtener todas las mesas de una sucursal' })
  @Permissions('restaurant.read')
  @Get('tables')
  async getAllTables(
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.restaurantsService.getAllTables(organizationId, branchId);
  }

  @ApiOperation({ summary: 'Obtener una mesa por su ID' })
  @Permissions('restaurant.read')
  @Get('tables/:id')
  async getTableById(@Param('id') id: string) {
    return this.restaurantsService.getTableById(id); // (Asegúrate de tener este método en tu service o implementarlo buscando en Prisma)
  }
}
