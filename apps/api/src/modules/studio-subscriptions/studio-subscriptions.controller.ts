import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StudioSubscriptionsService } from './studio-subscriptions.service';
import { CreateStudioSubscriptionDto } from './dto/create-studio-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Studio Subscriptions')
@ApiBearerAuth('JWT-auth')
@Controller('studio-subscriptions')
export class StudioSubscriptionsController {
  constructor(private readonly subscriptionsService: StudioSubscriptionsService) {}

  @ApiOperation({ summary: 'Asignar un paquete o plan de estudio a un cliente' })
  @Permissions('studio.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() dto: CreateStudioSubscriptionDto) {
    return this.subscriptionsService.create(dto);
  }

   @ApiOperation({ summary: 'Obtener suscripciones de estudio' })
  @Permissions('studio.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.subscriptionsService.findAll(organizationId, branchId, customerId);
  }

  @ApiOperation({ summary: 'Listar solicitudes de compra/renovación desde el portal público' })
  @Permissions('studio.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('package-requests/list')
  listPackageRequests(
    @Query('organizationId') organizationId: string,
    @Query('status') status?: string,
  ) {
    return this.subscriptionsService.listPackageRequests(organizationId, status);
  }

  @ApiOperation({ summary: 'Aprobar solicitud de paquete y activar suscripción automáticamente' })
  @Permissions('studio.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post('package-requests/:id/approve')
  approvePackageRequest(@Param('id') id: string, @Body('branchId') branchId?: string) {
    return this.subscriptionsService.approvePackageRequest(id, branchId);
  }

  @ApiOperation({ summary: 'Rechazar solicitud de paquete' })
  @Permissions('studio.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('package-requests/:id/reject')
  rejectPackageRequest(@Param('id') id: string) {
    return this.subscriptionsService.rejectPackageRequest(id);
  }

  @ApiOperation({ summary: 'Actualizar alertas médicas / lesiones de un alumno' })
  @Permissions('studio.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('customer/:customerId/medical-alerts')
  updateCustomerMedicalAlerts(
    @Param('customerId') customerId: string,
    @Body() payload: { medicalAlerts?: string; notes?: string },
  ) {
    return this.subscriptionsService.updateCustomerMedicalAlerts(customerId, payload);
  }

  @ApiOperation({ summary: 'Obtener detalle de una suscripción de estudio' })
  @Permissions('studio.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @ApiOperation({ summary: 'Registrar abono / pago parcial sobre una suscripción (CxC)' })
  @Permissions('studio.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post(':id/payments')
  recordPayment(@Param('id') id: string, @Body() payload: { amount: number; notes?: string }) {
    return this.subscriptionsService.recordPayment(id, payload);
  }

  @ApiOperation({ summary: 'Congelar / pausar una suscripción de estudio' })
  @Permissions('studio.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/freeze')
  freeze(@Param('id') id: string, @Body() payload: { reason?: string }) {
    return this.subscriptionsService.freeze(id, payload);
  }

  @ApiOperation({ summary: 'Reactivar / descongelar suscripción sumando los días pausados' })
  @Permissions('studio.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/unfreeze')
  unfreeze(@Param('id') id: string) {
    return this.subscriptionsService.unfreeze(id);
  }

  @ApiOperation({ summary: 'Extender vigencia de una suscripción por días adicionales' })
  @Permissions('studio.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/extend')
  extendValidity(
    @Param('id') id: string,
    @Body() payload: { extraDays: number; reason?: string },
  ) {
    return this.subscriptionsService.extendValidity(id, payload);
  }

  @ApiOperation({ summary: 'Cancelar una suscripción de estudio' })
  @Permissions('studio.delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.subscriptionsService.cancel(id);
  }
}
