import { Controller, Get, Post, Body, Patch, Param, Delete  } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
  summary: 'Create a new user',
})
@ApiResponse({
  status: 201,
  description: 'User created successfully.',
})
@ApiResponse({
  status: 404,
  description: 'Organization or Branch not found.',
})
@ApiResponse({
  status: 409,
  description: 'Email already exists or Branch does not belong to the organization.',
})
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }


  @ApiOperation({
  summary: 'Get all active users',
})
@ApiResponse({
  status: 200,
  description: 'List of active users.',
})
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @ApiOperation({
  summary: 'Get user by id',
})
@ApiResponse({
  status: 200,
  description: 'User found.',
})
@ApiResponse({
  status: 404,
  description: 'User not found.',
})
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @ApiOperation({
  summary: 'Update a user',
})
@ApiResponse({
  status: 200,
  description: 'User updated successfully.',
})
@ApiResponse({
  status: 404,
  description: 'User not found.',
})
@ApiResponse({
  status: 409,
  description: 'Email already exists.',
})
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @ApiOperation({
  summary: 'Deactivate a user',
})
@ApiResponse({
  status: 200,
  description: 'User deactivated successfully.',
})
@ApiResponse({
  status: 404,
  description: 'User not found.',
})
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
