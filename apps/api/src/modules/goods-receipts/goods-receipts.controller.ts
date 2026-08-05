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

import { GoodsReceiptsService } from './goods-receipts.service';

import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';

import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';

@ApiTags('Goods Receipts')
@ApiBearerAuth('JWT-auth')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Controller('goods-receipts')
export class GoodsReceiptsController {
  constructor(
    private readonly goodsReceiptsService: GoodsReceiptsService,
  ) {}
  @ApiOperation({
  summary: 'Create goods receipt',
})
@ApiResponse({
  status: 201,
  description:
    'Goods receipt created successfully.',
})
@ApiResponse({
  status: 404,
  description:
    'Purchase order or organization not found.',
})
@ApiResponse({
  status: 409,
  description:
    'Purchase order is not confirmed.',
})
@Permissions('goods-receipts.create')
@Post()
create(
  @Body()
  createGoodsReceiptDto: CreateGoodsReceiptDto,
) {
  return this.goodsReceiptsService.create(
    createGoodsReceiptDto,
  );
}

  @ApiOperation({
  summary: 'Get all goods receipts',
})
@ApiResponse({
  status: 200,
  description:
    'Goods receipts retrieved successfully.',
})
@Permissions('goods-receipts.read')
@Get()
findAll() {
  return this.goodsReceiptsService.findAll();
}

  @ApiOperation({
  summary: 'Get goods receipt by id',
})
@ApiResponse({
  status: 200,
  description:
    'Goods receipt retrieved successfully.',
})
@ApiResponse({
  status: 404,
  description:
    'Goods receipt not found.',
})
@Permissions('goods-receipts.read')
@Get(':id')
findOne(
  @Param('id')
  id: string,
) {
  return this.goodsReceiptsService.findOne(id);
}

  @ApiOperation({
  summary: 'Update goods receipt',
})
@ApiResponse({
  status: 200,
  description:
    'Goods receipt updated successfully.',
})
@ApiResponse({
  status: 404,
  description:
    'Goods receipt not found.',
})
@Permissions('goods-receipts.update')
@Patch(':id')
update(
  @Param('id')
  id: string,

  @Body()
  updateGoodsReceiptDto: UpdateGoodsReceiptDto,
) {
  return this.goodsReceiptsService.update(
    id,
    updateGoodsReceiptDto,
  );
}

  @ApiOperation({
  summary: 'Delete goods receipt',
})
@ApiResponse({
  status: 200,
  description:
    'Goods receipt deleted successfully.',
})
@ApiResponse({
  status: 404,
  description:
    'Goods receipt not found.',
})
@Permissions('goods-receipts.delete')
@Delete(':id')
remove(
  @Param('id')
  id: string,
) {
  return this.goodsReceiptsService.remove(id);
}
}
