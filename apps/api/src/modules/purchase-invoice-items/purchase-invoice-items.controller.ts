import {
  Body,
  Controller,
  Get,
  Post,
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

import { PurchaseInvoiceItemsService } from './purchase-invoice-items.service';

import { CreatePurchaseInvoiceItemDto } from './dto/create-purchase-invoice-item.dto';
import { UpdatePurchaseInvoiceItemDto } from './dto/update-purchase-invoice-item.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Purchase Invoice Items')
@ApiBearerAuth('JWT-auth')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Controller('purchase-invoice-items')
export class PurchaseInvoiceItemsController {
  constructor(
    private readonly purchaseInvoiceItemsService: PurchaseInvoiceItemsService,
  ) {}

  @ApiOperation({
    summary: 'Create purchase invoice item',
  })
  @ApiResponse({
    status: 201,
    description:
      'Purchase invoice item created successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase invoice or product not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Items can only be added to draft purchase invoices.',
  })
  @Permissions('purchase-invoice-items.create')
  @Post()
  create(
    @Body()
    createPurchaseInvoiceItemDto: CreatePurchaseInvoiceItemDto,
  ) {
    return this.purchaseInvoiceItemsService.create(
      createPurchaseInvoiceItemDto,
    );
  }

  @ApiOperation({
    summary: 'Get all purchase invoice items',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase invoice items list.',
  })
  @Permissions('purchase-invoice-items.read')
  @Get()
  findAll() {
    return this.purchaseInvoiceItemsService.findAll();
  }

  @ApiOperation({
    summary: 'Get purchase invoice item by id',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase invoice item found.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase invoice item not found.',
  })
  @Permissions('purchase-invoice-items.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.purchaseInvoiceItemsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update purchase invoice item',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase invoice item updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase invoice item not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Items can only be modified on draft purchase invoices.',
  })
  @Permissions('purchase-invoice-items.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    updatePurchaseInvoiceItemDto: UpdatePurchaseInvoiceItemDto,
  ) {
    return this.purchaseInvoiceItemsService.update(
      id,
      updatePurchaseInvoiceItemDto,
    );
  }

  @ApiOperation({
    summary: 'Delete purchase invoice item',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase invoice item deleted successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase invoice item not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Items can only be removed from draft purchase invoices.',
  })
  @Permissions('purchase-invoice-items.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.purchaseInvoiceItemsService.remove(id);
  }
}
