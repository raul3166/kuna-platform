import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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

import { GoodsReceiptItemsService } from './goods-receipt-items.service';

import { CreateGoodsReceiptItemDto } from './dto/create-goods-receipt-item.dto';
import { UpdateGoodsReceiptItemDto } from './dto/update-goods-receipt-item.dto';

@ApiTags('Goods Receipt Items')
@ApiBearerAuth('JWT-auth')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Controller('goods-receipt-items')
export class GoodsReceiptItemsController {
  constructor(
    private readonly goodsReceiptItemsService: GoodsReceiptItemsService,
  ) {}

  @ApiOperation({
    summary: 'Create goods receipt item',
  })
  @ApiResponse({
    status: 201,
    description:
      'Goods receipt item created successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Goods receipt, purchase order item or product not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Business validation failed.',
  })
  @Permissions('goods-receipt-items.create')
  @Post()
  create(
    @Body()
    createGoodsReceiptItemDto: CreateGoodsReceiptItemDto,
  ) {
    return this.goodsReceiptItemsService.create(
      createGoodsReceiptItemDto,
    );
  }

  @ApiOperation({
    summary: 'Get all goods receipt items',
  })
  @ApiResponse({
    status: 200,
    description:
      'Goods receipt items retrieved successfully.',
  })
  @Permissions('goods-receipt-items.read')
  @Get()
  findAll() {
    return this.goodsReceiptItemsService.findAll();
  }

  @ApiOperation({
    summary: 'Get goods receipt item by id',
  })
  @ApiResponse({
    status: 200,
    description:
      'Goods receipt item retrieved successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Goods receipt item not found.',
  })
  @Permissions('goods-receipt-items.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.goodsReceiptItemsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update goods receipt item',
  })
  @ApiResponse({
    status: 200,
    description:
      'Goods receipt item updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Goods receipt item not found.',
  })
  @Permissions('goods-receipt-items.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    updateGoodsReceiptItemDto: UpdateGoodsReceiptItemDto,
  ) {
    return this.goodsReceiptItemsService.update(
      id,
      updateGoodsReceiptItemDto,
    );
  }

  @ApiOperation({
    summary: 'Delete goods receipt item',
  })
  @ApiResponse({
    status: 200,
    description:
      'Goods receipt item deleted successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Goods receipt item not found.',
  })
  @Permissions('goods-receipt-items.delete')
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.goodsReceiptItemsService.remove(id);
  }
}
