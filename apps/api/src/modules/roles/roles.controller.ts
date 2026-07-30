import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

@ApiTags('Roles')
@ApiBearerAuth('JWT-auth')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({
  summary: 'Create a new role',
})
@ApiResponse({
  status: 201,
  description: 'Role created successfully.',
})
@ApiResponse({
  status: 404,
  description: 'Organization not found.',
})
@ApiResponse({
  status: 409,
  description: 'Role code already exists.',
})
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @ApiOperation({
  summary: 'Get all active roles',
})
@ApiResponse({
  status: 200,
  description: 'List of active roles.',
})
@UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @ApiOperation({
  summary: 'Get role by id',
})
@ApiResponse({
  status: 200,
  description: 'Role found.',
})
@ApiResponse({
  status: 404,
  description: 'Role not found.',
})
@UseGuards(JwtAuthGuard)
@Get(':id')
findOne(
  @Param('id') id: string,
) {
  return this.rolesService.findOne(id);
}

  @ApiOperation({
  summary: 'Update a role',
})
@ApiResponse({
  status: 200,
  description: 'Role updated successfully.',
})
@ApiResponse({
  status: 404,
  description: 'Role or Organization not found.',
})
@ApiResponse({
  status: 409,
  description: 'Role code already exists.',
})
@UseGuards(JwtAuthGuard)
@Patch(':id')
update(
  @Param('id') id: string,
  @Body() updateRoleDto: UpdateRoleDto,
) {
  return this.rolesService.update(
    id,
    updateRoleDto,
  );
}

  @ApiOperation({
  summary: 'Deactivate a role',
})
@ApiResponse({
  status: 200,
  description: 'Role deactivated successfully.',
})
@ApiResponse({
  status: 404,
  description: 'Role not found.',
})
@UseGuards(JwtAuthGuard)
@Delete(':id')
remove(
  @Param('id') id: string,
) {
  return this.rolesService.remove(id);
}
@ApiOperation({
  summary: 'Assign permissions to a role',
})
@ApiResponse({
  status: 200,
  description: 'Permissions assigned successfully.',
})
@ApiResponse({
  status: 404,
  description: 'Role or permission not found.',
})
@UseGuards(JwtAuthGuard)
@Post(':id/permissions')
assignPermissions(
  @Param('id') id: string,
  @Body() assignPermissionsDto: AssignPermissionsDto,
) {
  return this.rolesService.assignPermissions(
    id,
    assignPermissionsDto,
  );
}
@ApiOperation({
  summary: 'Get permissions assigned to a role',
})
@ApiResponse({
  status: 200,
  description: 'Permissions retrieved successfully.',
})
@ApiResponse({
  status: 404,
  description: 'Role not found.',
})
@UseGuards(JwtAuthGuard)
@Get(':id/permissions')
getRolePermissions(
  @Param('id') id: string,
) {
  return this.rolesService.getRolePermissions(id);
}
@ApiOperation({
  summary: 'Remove a permission from a role',
})
@ApiResponse({
  status: 200,
  description: 'Permission removed successfully.',
})
@ApiResponse({
  status: 404,
  description: 'Role not found or permission is not assigned.',
})
@UseGuards(JwtAuthGuard)
@Delete(':roleId/permissions/:permissionId')
removePermission(
  @Param('roleId') roleId: string,
  @Param('permissionId') permissionId: string,
) {
  return this.rolesService.removePermission(
    roleId,
    permissionId,
  );
}
}
