import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Permissions')
@ApiBearerAuth('JWT-auth')
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  create(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionsService.create(createPermissionDto);
  }

  @ApiOperation({
  summary: 'Get all active permissions',
})
@ApiResponse({
  status: 200,
  description: 'List of active permissions.',
})
@UseGuards(JwtAuthGuard)
@Get()
findAll() {
  return this.permissionsService.findAll();
}

  @ApiOperation({
  summary: 'Get permission by id',
})
@ApiResponse({
  status: 200,
  description: 'Permission found.',
})
@ApiResponse({
  status: 404,
  description: 'Permission not found.',
})
@UseGuards(JwtAuthGuard)
@Get(':id')
findOne(@Param('id') id: string) {
  return this.permissionsService.findOne(id);
}

  @ApiOperation({
  summary: 'Update a permission',
})
@ApiResponse({
  status: 200,
  description: 'Permission updated successfully.',
})
@ApiResponse({
  status: 404,
  description: 'Permission not found.',
})
@ApiResponse({
  status: 409,
  description: 'Permission code already exists.',
})
@UseGuards(JwtAuthGuard)
@Patch(':id')
update(
  @Param('id') id: string,
  @Body() updatePermissionDto: UpdatePermissionDto,
) {
  return this.permissionsService.update(
    id,
    updatePermissionDto,
  );
}

@ApiOperation({
  summary: 'Deactivate a permission',
})
@ApiResponse({
  status: 200,
  description: 'Permission deactivated successfully.',
})
@ApiResponse({
  status: 404,
  description: 'Permission not found.',
})
@UseGuards(JwtAuthGuard)
@Delete(':id')
remove(@Param('id') id: string) {
  return this.permissionsService.remove(id);
}
}
