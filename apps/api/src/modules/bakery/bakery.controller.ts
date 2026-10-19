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
import { BakeryService } from './bakery.service';
import { CreateBakeryRecipeDto } from './dto/create-bakery-recipe.dto';
import {
  CreateBakeryProductionOrderDto,
  UpdateBakeryConfigDto,
  UpdateBakeryProductionStatusDto,
} from './dto/bakery-production.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { VerticalGuard } from '../auth/guards/vertical.guard';
import { RequiresVertical } from '../auth/decorators/requires-vertical.decorator';

@ApiTags('Vertical: Bakery & Pastry (Panadería y Pastelería)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard, VerticalGuard)
@RequiresVertical('BAKERY')
@Controller('bakery')
export class BakeryController {
  constructor(private readonly bakeryService: BakeryService) {}

  @Get('dashboard')
  @ApiOperation({
    summary:
      'Obtiene KPIs de producción de panadería, Kanban de hornos y lotes frescos próximos a vencer',
  })
  getDashboard(
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
    @Req() req?: any,
  ) {
    return this.bakeryService.getDashboard(
      organizationId,
      branchId,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Get('recipes')
  @ApiOperation({
    summary: 'Lista recetas y fichas técnicas de panadería y pastelería',
  })
  findAllRecipes(
    @Query('organizationId') organizationId?: string,
    @Query('search') search?: string,
    @Req() req?: any,
  ) {
    return this.bakeryService.findAllRecipes(
      organizationId,
      search,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Get('recipes/:id')
  @ApiOperation({
    summary: 'Obtiene el detalle de una receta con sus ingredientes y costos',
  })
  findRecipeById(
    @Param('id') id: string,
    @Query('organizationId') organizationId?: string,
    @Req() req?: any,
  ) {
    return this.bakeryService.findRecipeById(
      id,
      organizationId,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Post('recipes')
  @ApiOperation({
    summary:
      'Crea una nueva receta técnica vinculando un Producto terminado con sus insumos',
  })
  createRecipe(@Body() dto: CreateBakeryRecipeDto, @Req() req?: any) {
    return this.bakeryService.createRecipe(
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Get('production-orders')
  @ApiOperation({
    summary: 'Lista órdenes/tandas de producción de panadería',
  })
  findAllProductionOrders(
    @Query('organizationId') organizationId?: string,
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Req() req?: any,
  ) {
    return this.bakeryService.findAllProductionOrders(
      organizationId,
      branchId,
      status,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Post('production-orders')
  @ApiOperation({
    summary: 'Programa o lanza una nueva tanda de horneado/producción',
  })
  createProductionOrder(
    @Body() dto: CreateBakeryProductionOrderDto,
    @Req() req?: any,
  ) {
    return this.bakeryService.createProductionOrder(
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Patch('production-orders/:id/status')
  @ApiOperation({
    summary:
      'Avanza la etapa de la tanda (Amasado -> Fermentación -> Horno -> Enfriamiento -> Completado con descarga de insumos y creación de lote fresco)',
  })
  updateProductionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBakeryProductionStatusDto,
    @Req() req?: any,
  ) {
    return this.bakeryService.updateProductionStatus(
      id,
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Get('config')
  @ApiOperation({
    summary: 'Obtiene la configuración operativa del vertical BAKERY',
  })
  getConfig(
    @Query('organizationId') organizationId?: string,
    @Req() req?: any,
  ) {
    return this.bakeryService.getConfig(
      organizationId,
      req?.user?.id || req?.user?.sub,
    );
  }

  @Patch('config')
  @ApiOperation({
    summary: 'Actualiza la configuración operativa del vertical BAKERY',
  })
  updateConfig(@Body() dto: UpdateBakeryConfigDto, @Req() req?: any) {
    return this.bakeryService.updateConfig(
      dto,
      req?.user?.id || req?.user?.sub,
    );
  }
}

