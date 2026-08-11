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

import { PurchaseReturnItemsService } from './purchase-return-items.service';

import { CreatePurchaseReturnItemDto } from './dto/create-purchase-return-item.dto';
import { UpdatePurchaseReturnItemDto } from './dto/update-purchase-return-item.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Purchase Return Items')
@ApiBearerAuth('JWT-auth')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Controller('purchase-return-items')
export class PurchaseReturnItemsController {
  constructor(
    private readonly purchaseReturnItemsService: PurchaseReturnItemsService,
  ) {}

  @ApiOperation({
    summary: 'Create purchase return item',
  })
  @ApiResponse({
    status: 201,
    description:
      'Purchase return item created successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase return, goods receipt item or product not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Items can only be added to draft purchase returns or quantity exceeds the received quantity.',
  })
  @Permissions('purchase-return-items.create')
  @Post()
  create(
    @Body()
    createPurchaseReturnItemDto: CreatePurchaseReturnItemDto,
  ) {
    return this.purchaseReturnItemsService.create(
      createPurchaseReturnItemDto,
    );
  }

  @ApiOperation({
    summary: 'Get all purchase return items',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase return items list.',
  })
  @Permissions('purchase-return-items.read')
  @Get()
  findAll() {
    return this.purchaseReturnItemsService.findAll();
  }

  @ApiOperation({
    summary: 'Get purchase return item by id',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase return item found.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase return item not found.',
  })
  @Permissions('purchase-return-items.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.purchaseReturnItemsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update purchase return item',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase return item updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase return item not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Items can only be modified on draft purchase returns.',
  })
  @Permissions('purchase-return-items.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    updatePurchaseReturnItemDto: UpdatePurchaseReturnItemDto,
  ) {
    return this.purchaseReturnItemsService.update(
      id,
      updatePurchaseReturnItemDto,
    );
  }

  @ApiOperation({
    summary: 'Delete purchase return item',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase return item deleted successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase return item not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Items can only be removed from draft purchase returns.',
  })
  @Permissions('purchase-return-items.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.purchaseReturnItemsService.remove(id);
  }
}
