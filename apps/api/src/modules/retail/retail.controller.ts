import {
  Body,
  Controller,
  Get,
  Patch,
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
import { RetailService } from './retail.service';
import { UpdateRetailConfigDto } from './dto/update-retail-config.dto';

@ApiTags('Vertical Retail')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard, VerticalGuard)
@RequiresVertical('RETAIL')
@Controller('retail')
export class RetailController {
  constructor(private readonly retailService: RetailService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Obtener métricas operativas de mostrador/tienda en tiempo real',
  })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Métricas de retail obtenidas exitosamente.',
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
    return this.retailService.getDashboard(orgId, branchId, user?.id);
  }

  @Get('config')
  @ApiOperation({
    summary: 'Obtener configuración personalizada del vertical Retail para la organización',
  })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Configuración de retail obtenida exitosamente.',
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
    return this.retailService.getConfig(orgId, user?.id);
  }

  @Patch('config')
  @ApiOperation({
    summary: 'Actualizar configuración personalizada de Retail (subtipo de tienda, lector, etc.)',
  })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada exitosamente.',
  })
  async updateConfig(
    @CurrentUser() user: any,
    @Req() req: any,
    @Body() dto: UpdateRetailConfigDto,
    @Query('organizationId') organizationId?: string,
  ) {
    const orgId =
      organizationId ||
      (req?.headers?.['x-organization-id'] as string) ||
      user?.organizationId ||
      req?.organizationId;
    return this.retailService.updateConfig(orgId, dto, user?.id);
  }
}

