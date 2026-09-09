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

  @ApiOperation({ summary: 'Obtener detalle de una suscripción de estudio' })
  @Permissions('studio.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @ApiOperation({ summary: 'Cancelar una suscripción de estudio' })
  @Permissions('studio.delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.subscriptionsService.cancel(id);
  }
}
