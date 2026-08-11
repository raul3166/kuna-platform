import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { PurchaseInvoicesService } from './purchase-invoices.service';

import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Purchase Invoices')
@ApiBearerAuth('JWT-auth')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Controller('purchase-invoices')
export class PurchaseInvoicesController {
  constructor(
    private readonly purchaseInvoicesService: PurchaseInvoicesService,
  ) {}

  @ApiOperation({
    summary: 'Create purchase invoice',
  })
  @ApiResponse({
    status: 201,
    description:
      'Purchase invoice created successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Organization, supplier, purchase order or goods receipt not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Purchase invoice number already exists or related entities do not match.',
  })
  @Permissions('purchase-invoices.create')
  @Post()
  create(
    @Body()
    createPurchaseInvoiceDto: CreatePurchaseInvoiceDto,
  ) {
    return this.purchaseInvoicesService.create(
      createPurchaseInvoiceDto,
    );
  }

  @ApiOperation({
    summary: 'Get all purchase invoices',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase invoices list.',
  })
  @Permissions('purchase-invoices.read')
  @Get()
  findAll() {
    return this.purchaseInvoicesService.findAll();
  }

  @ApiOperation({
    summary: 'Get purchase invoice by id',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase invoice found.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase invoice not found.',
  })
  @Permissions('purchase-invoices.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.purchaseInvoicesService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update purchase invoice',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase invoice updated.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase invoice or related entity not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Only draft purchase invoices can be modified.',
  })
  @Permissions('purchase-invoices.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    updatePurchaseInvoiceDto: UpdatePurchaseInvoiceDto,
  ) {
    return this.purchaseInvoicesService.update(
      id,
      updatePurchaseInvoiceDto,
    );
  }

  @ApiOperation({
    summary: 'Cancel purchase invoice',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase invoice cancelled successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase invoice not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Only draft purchase invoices can be cancelled.',
  })
  @Permissions('purchase-invoices.cancel')
@Patch(':id/cancel')
cancel(
  @Param('id')
  id: string,
) {
  return this.purchaseInvoicesService.cancel(id);
}
}
