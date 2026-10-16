import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
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
import { VerticalGuard } from '../auth/guards/vertical.guard';
import { RequiresVertical } from '../auth/decorators/requires-vertical.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AutomotiveService } from './automotive.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateVehicleCheckInDto } from './dto/create-vehicle-check-in.dto';
import { UpdateAutomotiveConfigDto } from './dto/update-automotive-config.dto';

@ApiTags('Vertical Taller Automotriz')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard, VerticalGuard)
@RequiresVertical('AUTOMOTIVE')
@Controller('automotive')
export class AutomotiveController {
  constructor(private readonly automotiveService: AutomotiveService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Obtener métricas operativas del patio/bahías del taller en tiempo real',
  })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Métricas de patio/taller obtenidas exitosamente.',
  })
  async getDashboard(
    @CurrentUser() user: any,
    @Req() req: any,
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
  ) {
    const orgId =
      organizationId ||
      (req?.headers?.['x-organization-id'] as string) ||
      user?.organizationId ||
      req?.organizationId;
    return this.automotiveService.getDashboard(orgId, branchId, user?.id);
  }

  @Get('vehicles')
  @ApiOperation({
    summary: 'Listar todos los vehículos registrados en la flota del taller',
  })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Vehículos obtenidos exitosamente.',
  })
  async findAllVehicles(
    @CurrentUser() user: any,
    @Req() req: any,
    @Query('organizationId') organizationId?: string,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
  ) {
    const orgId =
      organizationId ||
      (req?.headers?.['x-organization-id'] as string) ||
      user?.organizationId ||
      req?.organizationId;
    return this.automotiveService.findAllVehicles(orgId, search, customerId, user?.id);
  }

  @Get('vehicles/:id')
  @ApiOperation({
    summary: 'Obtener detalle y hoja de vida completa del vehículo (historial de órdenes y repuestos)',
  })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Ficha y hoja de vida del vehículo obtenida.',
  })
  async findVehicleById(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: any,
    @Query('organizationId') organizationId?: string,
  ) {
    const orgId =
      organizationId ||
      (req?.headers?.['x-organization-id'] as string) ||
      user?.organizationId ||
      req?.organizationId;
    return this.automotiveService.findVehicleById(id, orgId, user?.id);
  }

  @Post('vehicles')
  @ApiOperation({
    summary: 'Registrar un nuevo vehículo vinculado a un cliente',
  })
  @ApiResponse({
    status: 201,
    description: 'Vehículo registrado exitosamente.',
  })
  async createVehicle(
    @CurrentUser() user: any,
    @Req() req: any,
    @Body() dto: CreateVehicleDto,
  ) {
    if (!dto.organizationId) {
      dto.organizationId =
        (req?.headers?.['x-organization-id'] as string) ||
        user?.organizationId ||
        req?.organizationId;
    }
    return this.automotiveService.createVehicle(dto, user?.id);
  }

  @Patch('vehicles/:id')
  @ApiOperation({
    summary: 'Actualizar información del vehículo (kilometraje, color, observaciones)',
  })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Vehículo actualizado exitosamente.',
  })
  async updateVehicle(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: any,
    @Body() dto: UpdateVehicleDto,
    @Query('organizationId') organizationId?: string,
  ) {
    const orgId =
      organizationId ||
      (req?.headers?.['x-organization-id'] as string) ||
      user?.organizationId ||
      req?.organizationId;
    return this.automotiveService.updateVehicle(id, dto, orgId, user?.id);
  }

  @Post('check-in')
  @ApiOperation({
    summary: 'Registrar recepción / hoja de ingreso técnico de vehículo en taller',
  })
  @ApiResponse({
    status: 201,
    description: 'Recepción registrada exitosamente con su orden de servicio.',
  })
  async createCheckIn(
    @CurrentUser() user: any,
    @Req() req: any,
    @Body() dto: CreateVehicleCheckInDto,
  ) {
    if (!dto.organizationId) {
      dto.organizationId =
        (req?.headers?.['x-organization-id'] as string) ||
        user?.organizationId ||
        req?.organizationId;
    }
    if (!dto.branchId) {
      dto.branchId = req?.headers?.['x-branch-id'] as string;
    }
    return this.automotiveService.createCheckIn(dto, user?.id);
  }

  @Get('config')
  @ApiOperation({
    summary: 'Obtener configuración personalizada del taller (bahías, términos, checklist)',
  })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Configuración de taller obtenida exitosamente.',
  })
  async getConfig(
    @CurrentUser() user: any,
    @Req() req: any,
    @Query('organizationId') organizationId?: string,
  ) {
    const orgId =
      organizationId ||
      (req?.headers?.['x-organization-id'] as string) ||
      user?.organizationId ||
      req?.organizationId;
    return this.automotiveService.getConfig(orgId, user?.id);
  }

  @Patch('config')
  @ApiOperation({
    summary: 'Actualizar configuración del taller automotriz',
  })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada exitosamente.',
  })
  async updateConfig(
    @CurrentUser() user: any,
    @Req() req: any,
    @Body() dto: UpdateAutomotiveConfigDto,
    @Query('organizationId') organizationId?: string,
  ) {
    const orgId =
      organizationId ||
      (req?.headers?.['x-organization-id'] as string) ||
      user?.organizationId ||
      req?.organizationId;
    return this.automotiveService.updateConfig(orgId, dto, user?.id);
  }
}

