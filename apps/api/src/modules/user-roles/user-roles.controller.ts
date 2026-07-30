import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { UserRolesService } from './user-roles.service';

@ApiTags('User Roles')
@ApiBearerAuth('JWT-auth')
@Controller('user-roles')
export class UserRolesController {
  constructor(
  private readonly userRolesService: UserRolesService,
) {}
  @ApiOperation({
  summary: 'Assign one or more roles to a user',
})
@ApiResponse({
  status: 200,
  description: 'Roles assigned successfully.',
})
@ApiResponse({
  status: 404,
  description: 'User or role not found.',
})
@UseGuards(JwtAuthGuard)
@Post(':userId/roles')
assignRoles(
  @Param('userId') userId: string,
  @Body() assignUserRolesDto: AssignUserRolesDto,
) {
  return this.userRolesService.assignRoles(
    userId,
    assignUserRolesDto,
  );
}

@ApiOperation({
  summary: 'Get roles assigned to a user',
})
@ApiResponse({
  status: 200,
  description: 'Roles retrieved successfully.',
})
@ApiResponse({
  status: 404,
  description: 'User not found.',
})
@UseGuards(JwtAuthGuard)
@Get(':userId/roles')
getUserRoles(
  @Param('userId') userId: string,
) {
  return this.userRolesService.getUserRoles(
    userId,
  );
}

@ApiOperation({
  summary: 'Remove a role from a user',
})
@ApiResponse({
  status: 200,
  description: 'Role removed successfully.',
})
@ApiResponse({
  status: 404,
  description: 'User, role or assignment not found.',
})
@UseGuards(JwtAuthGuard)
@Delete(':userId/roles/:roleId')
removeRole(
  @Param('userId') userId: string,
  @Param('roleId') roleId: string,
) {
  return this.userRolesService.removeRole(
    userId,
    roleId,
  );
}
}
