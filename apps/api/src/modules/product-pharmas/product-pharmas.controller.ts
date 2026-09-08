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

import { ProductPharmasService } from './product-pharmas.service';
import { CreateProductPharmaDto } from './dto/create-product-pharma.dto';
import { UpdateProductPharmaDto } from './dto/update-product-pharma.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Product Pharmas')
@ApiBearerAuth('JWT-auth')
@Controller('product-pharmas')
export class ProductPharmasController {
  constructor(
    private readonly productPharmasService: ProductPharmasService,
  ) {}

  @ApiOperation({
    summary: 'Create or update pharma details for a product',
  })
  @ApiResponse({
    status: 201,
    description: 'Pharma details saved successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found.',
  })
  @Permissions('products.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() createProductPharmaDto: CreateProductPharmaDto) {
    return this.productPharmasService.createOrUpdate(createProductPharmaDto);
  }

  @ApiOperation({
    summary: 'Get pharma details by product id',
  })
  @ApiResponse({
    status: 200,
    description: 'Pharma details retrieved successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Pharma details not found for this product.',
  })
  @Permissions('products.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get('product/:productId')
  findByProductId(@Param('productId') productId: string) {
    return this.productPharmasService.findByProductId(productId);
  }

  @ApiOperation({
    summary: 'Update pharma details of a product',
  })
  @ApiResponse({
    status: 200,
    description: 'Pharma details updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Pharma details not found.',
  })
  @Permissions('products.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch('product/:productId')
  update(
    @Param('productId') productId: string,
    @Body() updateProductPharmaDto: UpdateProductPharmaDto,
  ) {
    return this.productPharmasService.update(productId, updateProductPharmaDto);
  }

  @ApiOperation({
    summary: 'Remove pharma details of a product',
  })
  @ApiResponse({
    status: 200,
    description: 'Pharma details removed successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Pharma details not found.',
  })
  @Permissions('products.delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete('product/:productId')
  remove(@Param('productId') productId: string) {
    return this.productPharmasService.remove(productId);
  }
}
