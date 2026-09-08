import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ProductLotsService } from './product-lots.service';
import { CreateProductLotDto } from './dto/create-product-lot.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Product Lots')
@ApiBearerAuth('JWT-auth')
@Controller('product-lots')
export class ProductLotsController {
  constructor(
    private readonly productLotsService: ProductLotsService,
  ) {}

  @ApiOperation({
    summary: 'Create or increment stock for a product lot',
  })
  @ApiResponse({
    status: 201,
    description: 'Product lot created or updated successfully.',
  })
  @Permissions('inventory.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() createProductLotDto: CreateProductLotDto) {
    return this.productLotsService.createOrIncrement(createProductLotDto);
  }

  @ApiOperation({
    summary: 'Get product lots ordered by FEFO (First Expired, First Out)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available lots ordered by expiration date.',
  })
  @Permissions('inventory.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('fefo')
  getLotsFEFO(
    @Query('productId') productId: string,
    @Query('branchId') branchId: string,
  ) {
    return this.productLotsService.getLotsFEFO(productId, branchId);
  }

  @ApiOperation({
    summary: 'Get lots expiring within a specific day threshold',
  })
  @ApiResponse({
    status: 200,
    description: 'List of expiring lots for the specified branch.',
  })
  @Permissions('inventory.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('expiring/:branchId')
  getExpiringLots(
    @Param('branchId') branchId: string,
    @Query('days') days?: string,
  ) {
    return this.productLotsService.getExpiringLots(
      branchId,
      days ? parseInt(days, 10) : 60,
    );
  }
}
