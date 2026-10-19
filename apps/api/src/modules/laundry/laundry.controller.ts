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
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LaundryService } from './laundry.service';
import { CreateLaundryTicketDto } from './dto/create-laundry-ticket.dto';
import {
  UpdateLaundryConfigDto,
  UpdateLaundryStatusDto,
} from './dto/update-laundry-ticket.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { VerticalGuard } from '../auth/guards/vertical.guard';
import { RequiresVertical } from '../auth/decorators/requires-vertical.decorator';
import { LaundryTicketStatus } from '@prisma/client';

@ApiTags('Laundry (Lavandería & Tintorería)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, VerticalGuard)
@RequiresVertical('LAUNDRY')
@Controller('laundry')
export class LaundryController {
  constructor(private readonly laundryService: LaundryService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Obtener tablero Kanban de planta y KPIs de lavandería' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  getDashboard(
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || req?.user?.sub;
    const orgId = organizationId || req?.user?.organizationId;
    return this.laundryService.getDashboard(orgId, branchId, userId);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Listar tickets de lavandería con filtros de estado y búsqueda' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: LaundryTicketStatus })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'customerId', required: false })
  findAllTickets(
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: LaundryTicketStatus,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || req?.user?.sub;
    const orgId = organizationId || req?.user?.organizationId;
    return this.laundryService.findAllTickets(
      orgId,
      branchId,
      status,
      search,
      customerId,
      userId,
    );
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Obtener detalle de un ticket de lavandería y sus prendas' })
  @ApiQuery({ name: 'organizationId', required: false })
  findTicketById(
    @Param('id') id: string,
    @Query('organizationId') organizationId?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || req?.user?.sub;
    const orgId = organizationId || req?.user?.organizationId;
    return this.laundryService.findTicketById(id, orgId, userId);
  }

  @Post('tickets')
  @ApiOperation({ summary: 'Registrar recepción de prendas / kilos y crear Orden de Servicio' })
  createTicket(@Body() dto: CreateLaundryTicketDto, @Req() req?: any) {
    const userId = req?.user?.id || req?.user?.sub;
    if (!dto.organizationId && req?.user?.organizationId) {
      dto.organizationId = req.user.organizationId;
    }
    return this.laundryService.createTicket(dto, userId);
  }

  @Patch('tickets/:id/status')
  @ApiOperation({ summary: 'Avanzar fase de lavado/secado/planchado/perchero/entrega del ticket' })
  updateTicketStatus(
    @Param('id') id: string,
    @Body() dto: UpdateLaundryStatusDto,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || req?.user?.sub;
    if (!dto.organizationId && req?.user?.organizationId) {
      dto.organizationId = req.user.organizationId;
    }
    return this.laundryService.updateTicketStatus(id, dto, userId);
  }

  @Get('config')
  @ApiOperation({ summary: 'Obtener configuración de tarifas y tiempos de lavandería' })
  @ApiQuery({ name: 'organizationId', required: false })
  getConfig(
    @Query('organizationId') organizationId?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id || req?.user?.sub;
    const orgId = organizationId || req?.user?.organizationId;
    return this.laundryService.getConfig(orgId, userId);
  }

  @Patch('config')
  @ApiOperation({ summary: 'Actualizar configuración de tarifas y tiempos de lavandería' })
  updateConfig(@Body() dto: UpdateLaundryConfigDto, @Req() req?: any) {
    const userId = req?.user?.id || req?.user?.sub;
    if (!dto.organizationId && req?.user?.organizationId) {
      dto.organizationId = req.user.organizationId;
    }
    return this.laundryService.updateConfig(dto, userId);
  }
}

