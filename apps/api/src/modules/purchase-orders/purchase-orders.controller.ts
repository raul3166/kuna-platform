import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { PermissionsGuard } from '../auth/guards/permissions.guard';

import { Permissions } from '../auth/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@ApiTags('Purchase Orders')
@ApiBearerAuth('JWT-auth')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @ApiOperation({
  summary: 'Create purchase order',
})
@ApiResponse({
  status: 201,
  description: 'Purchase order created successfully.',
})
@ApiResponse({
  status: 404,
  description: 'Organization or supplier not found.',
})
@ApiResponse({
  status: 409,
  description: 'Purchase order number already exists.',
})
@Permissions('purchase-orders.create')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Post()
  create(@Body() createPurchaseOrderDto: CreatePurchaseOrderDto) {
    return this.purchaseOrdersService.create(createPurchaseOrderDto);
  }

  @ApiOperation({
  summary: 'Get all purchase orders',
})
@ApiResponse({
  status: 200,
  description: 'Purchase orders list.',
})
@Permissions('purchase-orders.read')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Get()
  findAll() {
    return this.purchaseOrdersService.findAll();
  }

  @ApiOperation({
  summary: 'Get purchase order by id',
})
@ApiResponse({
  status: 200,
  description: 'Purchase order found.',
})
@ApiResponse({
  status: 404,
  description: 'Purchase order not found.',
})
@Permissions('purchase-orders.read')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Get(':id')
findOne(
  @Param('id') id: string,
) {
  return this.purchaseOrdersService.findOne(id);
}

  @ApiOperation({
  summary: 'Update purchase order',
})
@ApiResponse({
  status: 200,
  description: 'Purchase order updated.',
})
@ApiResponse({
  status: 409,
  description: 'Only draft purchase orders can be modified.',
})
@Permissions('purchase-orders.update')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Patch(':id')
update(
  @Param('id') id: string,
  @Body()
  updatePurchaseOrderDto: UpdatePurchaseOrderDto,
) {
  return this.purchaseOrdersService.update(
    id,
    updatePurchaseOrderDto,
  );
}

  @ApiOperation({
  summary: 'Cancel purchase order',
})
@ApiResponse({
  status: 200,
  description: 'Purchase order cancelled.',
})
@ApiResponse({
  status: 409,
  description: 'Only draft purchase orders can be cancelled.',
})
@Permissions('purchase-orders.cancel')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Patch(':id/cancel')
cancel(
  @Param('id') id: string,
) {
  return this.purchaseOrdersService.cancel(id);
}

@ApiOperation({
  summary: 'Confirm purchase order',
})
@ApiResponse({
  status: 200,
  description: 'Purchase order confirmed successfully.',
})
@ApiResponse({
  status: 404,
  description: 'Purchase order not found.',
})
@ApiResponse({
  status: 409,
  description: 'Only draft purchase orders can be confirmed.',
})
@Permissions('purchase-orders.confirm')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Patch(':id/confirm')
confirm(
  @Param('id') id: string,
) {
  return this.purchaseOrdersService.confirm(id);
}
}
