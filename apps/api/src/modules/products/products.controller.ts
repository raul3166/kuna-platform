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

import { ProductsService } from './products.service';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  @ApiOperation({
    summary: 'Create a new product',
  })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Product SKU already exists.',
  })
  @Permissions('products.create')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Post()
  create(
    @Body()
    createProductDto: CreateProductDto,
  ) {
    return this.productsService.create(
      createProductDto,
    );
  }

  @ApiOperation({
    summary: 'Get all active products',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active products.',
  })
  @Permissions('products.read')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @ApiOperation({
    summary: 'Get product by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Product found.',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found.',
  })
  @Permissions('products.read')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.productsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update a product',
  })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Product SKU already exists.',
  })
  @Permissions('products.update')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(
      id,
      updateProductDto,
    );
  }

  @ApiOperation({
    summary: 'Deactivate a product',
  })
  @ApiResponse({
    status: 200,
    description: 'Product deactivated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Product not found.',
  })
  @Permissions('products.delete')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.productsService.remove(id);
  }
}
