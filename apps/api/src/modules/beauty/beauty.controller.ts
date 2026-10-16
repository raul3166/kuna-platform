import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { VerticalGuard } from '../auth/guards/vertical.guard';
import { RequiresVertical } from '../auth/decorators/requires-vertical.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BeautyService } from './beauty.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import {
  CreateBeautyNoteDto,
  CreateTimeOffDto,
  RescheduleAppointmentDto,
  SetWorkerScheduleDto,
  UpdateAppointmentStatusDto,
  UpdateBeautyConfigDto,
} from './dto/beauty-misc.dto';

@ApiTags('Vertical Belleza (Salón / Barbería / Spa)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard, VerticalGuard)
@RequiresVertical('BEAUTY')
@Controller('beauty')
export class BeautyController {
  constructor(private readonly beautyService: BeautyService) {}

  private orgOf(user: any, req: any, organizationId?: string): string | undefined {
    return (
      organizationId ||
      (req?.headers?.['x-organization-id'] as string) ||
      user?.organizationId ||
      req?.organizationId
    );
  }

  private branchOf(req: any, branchId?: string): string | undefined {
    return branchId || (req?.headers?.['x-branch-id'] as string) || undefined;
  }

  // ---------------- Dashboard ----------------

  @Get('dashboard')
  @ApiOperation({ summary: 'Resumen de la agenda del día (KPIs, citas, productividad)' })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD (hoy por defecto)' })
  @ApiQuery({ name: 'branchId', required: false })
  getDashboard(
    @CurrentUser() user: any,
    @Req() req: any,
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
    @Query('date') date?: string,
  ) {
    return this.beautyService.getDashboard(
      this.orgOf(user, req, organizationId),
      this.branchOf(req, branchId),
      date,
      user?.id,
    );
  }

  // ---------------- Disponibilidad ----------------

  @Get('availability')
  @ApiOperation({ summary: 'Huecos libres de un profesional en una fecha' })
  @ApiQuery({ name: 'workerId', required: true })
  @ApiQuery({ name: 'date', required: true })
  @ApiQuery({ name: 'durationMinutes', required: false })
  getAvailability(
    @CurrentUser() user: any,
    @Req() req: any,
    @Query('workerId') workerId: string,
    @Query('date') date: string,
    @Query('durationMinutes') durationMinutes?: string,
    @Query('branchId') branchId?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.beautyService.getAvailability(
      this.orgOf(user, req, organizationId),
      {
        workerId,
        date,
        branchId: this.branchOf(req, branchId) as string,
        durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      },
      user?.id,
    );
  }

  // ---------------- Citas ----------------

  @Get('appointments')
  @ApiOperation({ summary: 'Listar citas por rango, profesional, estado o cliente' })
  findAppointments(
    @CurrentUser() user: any,
    @Req() req: any,
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('workerId') workerId?: string,
    @Query('status') status?: AppointmentStatus,
    @Query('customerId') customerId?: string,
  ) {
    return this.beautyService.findAppointments(
      this.orgOf(user, req, organizationId),
      {
        from,
        to,
        workerId,
        status,
        customerId,
        branchId: this.branchOf(req, branchId),
      },
      user?.id,
    );
  }

  @Get('appointments/:id')
  @ApiOperation({ summary: 'Detalle de una cita' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: any,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.beautyService.findOneAppointment(
      id,
      this.orgOf(user, req, organizationId),
      user?.id,
    );
  }

  @Post('appointments')
  @ApiOperation({ summary: 'Agendar una cita (valida horario, ausencias y cruces)' })
  createAppointment(
    @CurrentUser() user: any,
    @Req() req: any,
    @Body() dto: CreateAppointmentDto,
  ) {
    if (!dto.organizationId) dto.organizationId = this.orgOf(user, req);
    if (!dto.branchId) dto.branchId = this.branchOf(req);
    return this.beautyService.createAppointment(dto, user?.id);
  }

  @Patch('appointments/:id/reschedule')
  @ApiOperation({ summary: 'Reprogramar una cita' })
  reschedule(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: any,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.beautyService.reschedule(id, dto, this.orgOf(user, req), user?.id);
  }

  @Patch('appointments/:id/status')
  @ApiOperation({ summary: 'Confirmar, cancelar o marcar no-show' })
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Req() req: any,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.beautyService.updateStatus(id, dto, this.orgOf(user, req), user?.id);
  }

  @Post('appointments/:id/start')
  @ApiOperation({
    summary: 'Iniciar servicio: genera la Orden de Servicio (Core) con sus tareas',
  })
  start(@Param('id') id: string, @CurrentUser() user: any, @Req() req: any) {
    return this.beautyService.startService(id, this.orgOf(user, req), user?.id);
  }

  @Post('appointments/:id/complete')
  @ApiOperation({
    summary: 'Finalizar servicio (descuenta insumos una sola vez); listo para cobrar en POS',
  })
  complete(@Param('id') id: string, @CurrentUser() user: any, @Req() req: any) {
    return this.beautyService.completeService(id, this.orgOf(user, req), user?.id);
  }

  // ---------------- Horarios y ausencias ----------------

  @Get('workers/:workerId/schedule')
  @ApiOperation({ summary: 'Horario semanal del profesional' })
  getSchedule(
    @Param('workerId') workerId: string,
    @CurrentUser() user: any,
    @Req() req: any,
    @Query('branchId') branchId?: string,
  ) {
    return this.beautyService.getWorkerSchedule(
      workerId,
      this.orgOf(user, req),
      this.branchOf(req, branchId),
      user?.id,
    );
  }

  @Put('workers/:workerId/schedule')
  @ApiOperation({ summary: 'Reemplazar el horario semanal del profesional en una sucursal' })
  setSchedule(
    @Param('workerId') workerId: string,
    @CurrentUser() user: any,
    @Req() req: any,
    @Body() dto: SetWorkerScheduleDto,
  ) {
    if (!dto.branchId) dto.branchId = this.branchOf(req);
    return this.beautyService.setWorkerSchedule(
      workerId,
      dto,
      this.orgOf(user, req),
      user?.id,
    );
  }

  @Get('time-off')
  @ApiOperation({ summary: 'Listar ausencias (vacaciones, incapacidades, permisos)' })
  listTimeOff(
    @CurrentUser() user: any,
    @Req() req: any,
    @Query('workerId') workerId?: string,
  ) {
    return this.beautyService.listTimeOff(this.orgOf(user, req), workerId, user?.id);
  }

  @Post('time-off')
  @ApiOperation({ summary: 'Registrar ausencia de un profesional' })
  createTimeOff(@CurrentUser() user: any, @Req() req: any, @Body() dto: CreateTimeOffDto) {
    return this.beautyService.createTimeOff(dto, this.orgOf(user, req), user?.id);
  }

  @Delete('time-off/:id')
  @ApiOperation({ summary: 'Eliminar ausencia' })
  removeTimeOff(@Param('id') id: string, @CurrentUser() user: any, @Req() req: any) {
    return this.beautyService.removeTimeOff(id, this.orgOf(user, req), user?.id);
  }

  // ---------------- Cliente: historial y fórmulas ----------------

  @Get('customers/:customerId/history')
  @ApiOperation({ summary: 'Historial de visitas, gasto y notas/fórmulas del cliente' })
  history(
    @Param('customerId') customerId: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.beautyService.getCustomerHistory(
      customerId,
      this.orgOf(user, req),
      user?.id,
    );
  }

  @Post('notes')
  @ApiOperation({ summary: 'Agregar nota / fórmula al cliente' })
  createNote(@CurrentUser() user: any, @Req() req: any, @Body() dto: CreateBeautyNoteDto) {
    return this.beautyService.createNote(dto, this.orgOf(user, req), user?.id);
  }

  @Delete('notes/:id')
  @ApiOperation({ summary: 'Eliminar nota del cliente' })
  removeNote(@Param('id') id: string, @CurrentUser() user: any, @Req() req: any) {
    return this.beautyService.removeNote(id, this.orgOf(user, req), user?.id);
  }

  // ---------------- Configuración ----------------

  @Get('config')
  @ApiOperation({ summary: 'Configuración del vertical (agenda)' })
  getConfig(
    @CurrentUser() user: any,
    @Req() req: any,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.beautyService.getConfig(this.orgOf(user, req, organizationId), user?.id);
  }

  @Patch('config')
  @ApiOperation({ summary: 'Actualizar configuración de agenda' })
  updateConfig(
    @CurrentUser() user: any,
    @Req() req: any,
    @Body() dto: UpdateBeautyConfigDto,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.beautyService.updateConfig(
      this.orgOf(user, req, organizationId),
      dto,
      user?.id,
    );
  }
}

