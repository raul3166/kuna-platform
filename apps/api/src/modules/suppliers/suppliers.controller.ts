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
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { SuppliersService } from './suppliers.service';

import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Suppliers')
@ApiBearerAuth('JWT-auth')
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
  ) {}

  @ApiOperation({
    summary: 'Create a new supplier',
  })
  @ApiResponse({
    status: 201,
    description: 'Supplier created successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Supplier already exists.',
  })
  @Permissions('suppliers.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(
    @Body() createSupplierDto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(
      createSupplierDto,
    );
  }

  @ApiOperation({
    summary: 'Get all active suppliers',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active suppliers.',
  })
  @Permissions('suppliers.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll() {
    return this.suppliersService.findAll();
  }

  @ApiOperation({
    summary: 'Get supplier by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Supplier found.',
  })
  @ApiResponse({
    status: 404,
    description: 'Supplier not found.',
  })
  @Permissions('suppliers.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(
    @Param('id') id: string,
  ) {
    return this.suppliersService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update supplier',
  })
  @ApiResponse({
    status: 200,
    description: 'Supplier updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Supplier not found.',
  })
  @Permissions('suppliers.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(
      id,
      updateSupplierDto,
    );
  }

  @ApiOperation({
    summary: 'Deactivate supplier',
  })
  @ApiResponse({
    status: 200,
    description: 'Supplier deactivated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Supplier not found.',
  })
  @Permissions('suppliers.delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  remove(
    @Param('id') id: string,
  ) {
    return this.suppliersService.remove(id);
  }
}
