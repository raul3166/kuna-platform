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

import { PurchaseOrderItemsService } from './purchase-order-items.service';

import { CreatePurchaseOrderItemDto } from './dto/create-purchase-order-item.dto';
import { UpdatePurchaseOrderItemDto } from './dto/update-purchase-order-item.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Purchase Order Items')
@ApiBearerAuth('JWT-auth')
@Controller('purchase-order-items')
export class PurchaseOrderItemsController {
  constructor(
    private readonly purchaseOrderItemsService: PurchaseOrderItemsService,
  ) {}

  @ApiOperation({
    summary: 'Create purchase order item',
  })
  @ApiResponse({
    status: 201,
    description: 'Purchase order item created successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Purchase order or product not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Items can only be added to draft purchase orders.',
  })
  @Permissions('purchase-order-items.create')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Post()
  create(
    @Body()
    createPurchaseOrderItemDto: CreatePurchaseOrderItemDto,
  ) {
    return this.purchaseOrderItemsService.create(
      createPurchaseOrderItemDto,
    );
  }

  @ApiOperation({
    summary: 'Get all purchase order items',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order items list.',
  })
  @Permissions('purchase-order-items.read')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Get()
  findAll() {
    return this.purchaseOrderItemsService.findAll();
  }

  @ApiOperation({
    summary: 'Get purchase order item by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order item found.',
  })
  @ApiResponse({
    status: 404,
    description: 'Purchase order item not found.',
  })
  @Permissions('purchase-order-items.read')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.purchaseOrderItemsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update purchase order item',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order item updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Purchase order item not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Items can only be modified on draft purchase orders.',
  })
  @Permissions('purchase-order-items.update')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    updatePurchaseOrderItemDto: UpdatePurchaseOrderItemDto,
  ) {
    return this.purchaseOrderItemsService.update(
      id,
      updatePurchaseOrderItemDto,
    );
  }

  @ApiOperation({
    summary: 'Delete purchase order item',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase order item deleted successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Purchase order item not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Items can only be removed from draft purchase orders.',
  })
  @Permissions('purchase-order-items.delete')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.purchaseOrderItemsService.remove(id);
  }
}
