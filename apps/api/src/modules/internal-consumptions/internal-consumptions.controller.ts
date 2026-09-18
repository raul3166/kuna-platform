import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { InternalConsumptionsService } from './internal-consumptions.service';
import { CreateInternalConsumptionDto } from './dto/create-internal-consumption.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Internal Consumptions')
@ApiBearerAuth('JWT-auth')
@Controller('internal-consumptions')
export class InternalConsumptionsController {
  constructor(
    private readonly internalConsumptionsService: InternalConsumptionsService,
  ) {}

  @ApiOperation({ summary: 'Registrar un consumo interno' })
  @ApiResponse({
    status: 201,
    description: 'Consumo interno registrado y stock descontado exitosamente.',
  })
  @ApiResponse({
    status: 400,
    description: 'Stock insuficiente para alguno de los productos.',
  })
  @Permissions('internal-consumptions.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() dto: CreateInternalConsumptionDto) {
    return this.internalConsumptionsService.create(dto);
  }

  @ApiOperation({ summary: 'Obtener lista de consumos internos' })
  @ApiResponse({
    status: 200,
    description: 'Lista de consumos internos devuelta correctamente.',
  })
  @Permissions('internal-consumptions.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.internalConsumptionsService.findAll({
      organizationId,
      branchId,
    });
  }

  @ApiOperation({ summary: 'Obtener detalle de un consumo interno' })
  @ApiResponse({
    status: 200,
    description: 'Detalle del consumo interno encontrado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Consumo interno no encontrado.',
  })
  @Permissions('internal-consumptions.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.internalConsumptionsService.findOne(id, organizationId);
  }
}
