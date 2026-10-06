import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { VerticalsService } from './verticals.service';
import { ToggleVerticalDto } from './dto/toggle-vertical.dto';
import { UpdateVerticalConfigDto } from './dto/update-vertical-config.dto';

@ApiTags('Verticales de Negocio')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('verticals')
export class VerticalsController {
  constructor(private readonly verticalsService: VerticalsService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar catálogo maestro de todos los verticales disponibles en KUNA',
  })
  @ApiResponse({ status: 200, description: 'Catálogo obtenido exitosamente.' })
  async findAll() {
    return this.verticalsService.findAll();
  }

  @Get('organization/:organizationId')
  @ApiOperation({
    summary: 'Obtener estado de los verticales para una organización específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de verticales de la organización obtenido exitosamente.',
  })
  async findByOrganization(@Param('organizationId') organizationId: string) {
    return this.verticalsService.findByOrganization(organizationId);
  }

  @Post('organization/:organizationId/toggle')
  @Permissions('organizations.update')
  @ApiOperation({
    summary: 'Activar o desactivar un vertical de negocio para una organización',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado del vertical actualizado exitosamente.',
  })
  async toggle(
    @Param('organizationId') organizationId: string,
    @Body() toggleDto: ToggleVerticalDto,
  ) {
    return this.verticalsService.toggle(organizationId, toggleDto);
  }

  @Patch('organization/:organizationId/:verticalCode/config')
  @Permissions('organizations.update')
  @ApiOperation({
    summary: 'Actualizar configuración JSON de un vertical para una organización',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada exitosamente.',
  })
  async updateConfig(
    @Param('organizationId') organizationId: string,
    @Param('verticalCode') verticalCode: string,
    @Body() updateConfigDto: UpdateVerticalConfigDto,
  ) {
    return this.verticalsService.updateConfig(
      organizationId,
      verticalCode,
      updateConfigDto,
    );
  }
}

