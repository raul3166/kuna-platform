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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RealEstateService } from './real-estate.service';
import {
  CreateRealEstateLeaseDto,
  CreateRealEstatePropertyDto,
  GenerateRentChargeDto,
  UpdateRealEstateConfigDto,
  UpdateRealEstatePropertyStatusDto,
} from './dto/real-estate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { VerticalGuard } from '../auth/guards/vertical.guard';
import { RequiresVertical } from '../auth/decorators/requires-vertical.decorator';

@ApiTags('Vertical: Real Estate & Property Management (Inmobiliaria)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, VerticalGuard)
@RequiresVertical('REAL_ESTATE')
@Controller('real-estate')
export class RealEstateController {
  constructor(private readonly realEstateService: RealEstateService) {}

  @Get('dashboard')
  @ApiOperation({
    summary:
      'Obtiene KPIs de portafolio inmobiliario, Kanban de ocupación de inmuebles y cánones de arrendamiento con cobro POS',
  })
  getDashboard(
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
    @Req() req?: any,
  ) {
    return this.realEstateService.getDashboard(
      organizationId,
      branchId,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Get('properties')
  @ApiOperation({
    summary: 'Lista inmuebles y unidades inmobiliarias con su propietario y estado',
  })
  findAllProperties(
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    return this.realEstateService.findAllProperties(
      organizationId,
      branchId,
      status,
      search,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Post('properties')
  @ApiOperation({
    summary: 'Registra un nuevo inmueble vinculándolo a un Propietario (Customer)',
  })
  createProperty(@Body() dto: CreateRealEstatePropertyDto, @Req() req?: any) {
    return this.realEstateService.createProperty(
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Patch('properties/:id/status')
  @ApiOperation({
    summary:
      'Actualiza el estado operativo de un inmueble (AVAILABLE, RENTED, MAINTENANCE, RESERVED, SOLD)',
  })
  updatePropertyStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRealEstatePropertyStatusDto,
    @Req() req?: any,
  ) {
    return this.realEstateService.updatePropertyStatus(
      id,
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Get('leases')
  @ApiOperation({
    summary: 'Lista contratos de arrendamiento con su inquilino, propietario y cánones',
  })
  findAllLeases(
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Req() req?: any,
  ) {
    return this.realEstateService.findAllLeases(
      organizationId,
      branchId,
      status,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Post('leases')
  @ApiOperation({
    summary:
      'Formaliza un contrato de arrendamiento, marca el inmueble como RENTED y genera el primer canon para cobro en POS',
  })
  createLease(@Body() dto: CreateRealEstateLeaseDto, @Req() req?: any) {
    return this.realEstateService.createLease(
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Post('rent-charges')
  @ApiOperation({
    summary:
      'Genera el canon mensual de arriendo para un periodo, calculando comisión de agencia y neto del propietario, y crea su ServiceOrder POS',
  })
  generateRentCharge(@Body() dto: GenerateRentChargeDto, @Req() req?: any) {
    return this.realEstateService.generateRentCharge(
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Patch('rent-charges/:id/disburse')
  @ApiOperation({
    summary: 'Marca o desmarca el giro/dispersión del canon neto al propietario',
  })
  markOwnerDisbursed(
    @Param('id') id: string,
    @Query('organizationId') organizationId?: string,
    @Req() req?: any,
  ) {
    return this.realEstateService.markOwnerDisbursed(
      id,
      organizationId,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Get('config')
  @ApiOperation({
    summary: 'Obtiene la configuración operativa del vertical REAL_ESTATE',
  })
  getConfig(
    @Query('organizationId') organizationId?: string,
    @Req() req?: any,
  ) {
    return this.realEstateService.getConfig(
      organizationId,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Patch('config')
  @ApiOperation({
    summary: 'Actualiza la configuración operativa del vertical REAL_ESTATE',
  })
  updateConfig(@Body() dto: UpdateRealEstateConfigDto, @Req() req?: any) {
    return this.realEstateService.updateConfig(
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }
}

