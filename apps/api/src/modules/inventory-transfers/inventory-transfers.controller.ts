import {
  Body,
  Controller,
  Get,
  Param,
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

import { InventoryTransfersService } from './inventory-transfers.service';

import { CreateInventoryTransferDto } from './dto/create-inventory-transfer.dto';

@ApiTags('Inventory Transfers')
@ApiBearerAuth('JWT-auth')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Controller('inventory-transfers')
export class InventoryTransfersController {
  constructor(
    private readonly inventoryTransfersService: InventoryTransfersService,
  ) {}

  @ApiOperation({
    summary: 'Create inventory transfer',
  })
  @ApiResponse({
    status: 201,
    description:
      'Inventory transfer created successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Organization, product or branch not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Transfer validation failed or insufficient stock.',
  })
  @Permissions('inventory-transfers.create')
  @Post()
  create(
    @Body()
    createInventoryTransferDto: CreateInventoryTransferDto,
  ) {
    return this.inventoryTransfersService.create(
      createInventoryTransferDto,
    );
  }

  @ApiOperation({
    summary: 'Get all inventory transfers',
  })
  @ApiResponse({
    status: 200,
    description:
      'Inventory transfers retrieved successfully.',
  })
  @Permissions('inventory-transfers.read')
  @Get()
  findAll() {
    return this.inventoryTransfersService.findAll();
  }

  @ApiOperation({
    summary: 'Get inventory transfer by id',
  })
  @ApiResponse({
    status: 200,
    description:
      'Inventory transfer retrieved successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Inventory transfer not found.',
  })
  @Permissions('inventory-transfers.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.inventoryTransfersService.findOne(id);
  }
}
