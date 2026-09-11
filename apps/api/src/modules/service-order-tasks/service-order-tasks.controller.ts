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

import { ServiceOrderTasksService } from './service-order-tasks.service';
import { CreateServiceOrderTaskDto } from './dto/create-service-order-task.dto';

@ApiTags('Service Order Tasks')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('service-order-tasks')
export class ServiceOrderTasksController {
  constructor(private readonly serviceOrderTasksService: ServiceOrderTasksService) {}

  @Post()
  @Permissions('service-orders.update')
  @ApiOperation({ summary: 'Add a task to a service order' })
  @ApiResponse({ status: 201, description: 'Task added successfully.' })
  create(@Body() dto: CreateServiceOrderTaskDto) {
    return this.serviceOrderTasksService.create(dto);
  }

  @Delete(':id')
  @Permissions('service-orders.update')
  @ApiOperation({ summary: 'Remove a task from a service order' })
  @ApiResponse({ status: 200, description: 'Task removed successfully.' })
  remove(@Param('id') id: string) {
    return this.serviceOrderTasksService.remove(id);
  }
}
