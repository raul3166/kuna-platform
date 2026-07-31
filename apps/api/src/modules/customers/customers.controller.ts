import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { CustomersService } from './customers.service';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Customers')
@ApiBearerAuth('JWT-auth')
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
  ) {}

  @ApiOperation({
    summary: 'Create a new customer',
  })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Customer email already exists.',
  })
  @Permissions('customers.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(
    @Body() createCustomerDto: CreateCustomerDto,
  ) {
    return this.customersService.create(
      createCustomerDto,
    );
  }

  @ApiOperation({
    summary: 'Get all active customers',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active customers.',
  })
  @Permissions('customers.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll() {
    return this.customersService.findAll();
  }

  @ApiOperation({
    summary: 'Get customer by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer found.',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found.',
  })
  @Permissions('customers.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.customersService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update a customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Customer email already exists.',
  })
  @Permissions('customers.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(
      id,
      updateCustomerDto,
    );
  }

  @ApiOperation({
    summary: 'Deactivate a customer',
  })
  @ApiResponse({
    status: 200,
    description: 'Customer deactivated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Customer not found.',
  })
  @Permissions('customers.delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.customersService.remove(id);
  }
}
