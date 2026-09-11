import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
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

import { ServiceOrderMaterialsService } from './service-order-materials.service';
import { CreateServiceOrderMaterialDto } from './dto/create-service-order-material.dto';

@ApiTags('Service Order Materials')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('service-order-materials')
export class ServiceOrderMaterialsController {
  constructor(private readonly serviceOrderMaterialsService: ServiceOrderMaterialsService) {}

  @Post()
  @Permissions('service-orders.update')
  @ApiOperation({ summary: 'Add a material to a service order' })
  @ApiResponse({ status: 201, description: 'Material added successfully.' })
  create(@Body() dto: CreateServiceOrderMaterialDto) {
    return this.serviceOrderMaterialsService.create(dto);
  }

  @Delete(':id')
  @Permissions('service-orders.update')
  @ApiOperation({ summary: 'Remove a material from a service order' })
  @ApiResponse({ status: 200, description: 'Material removed successfully.' })
  remove(@Param('id') id: string) {
    return this.serviceOrderMaterialsService.remove(id);
  }
}
