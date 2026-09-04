import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ProductCategoriesService } from './product-categories.service';

import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Product Categories')
@ApiBearerAuth('JWT-auth')
@Controller('product-categories')
export class ProductCategoriesController {
  constructor(
    private readonly productCategoriesService: ProductCategoriesService,
  ) {}

  @ApiOperation({
    summary: 'Create a new product category',
  })
  @ApiResponse({
    status: 201,
    description: 'Product category created successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'Category already exists.',
  })
  @Permissions('product-categories.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(
    @Body()
    createProductCategoryDto: CreateProductCategoryDto,
  ) {
    return this.productCategoriesService.create(
      createProductCategoryDto,
    );
  }

  @ApiOperation({
    summary: 'Get all active product categories',
  })
  @ApiResponse({
    status: 200,
    description: 'List of active product categories.',
  })
  @Permissions('product-categories.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll(@Query('organizationId') organizationId?: string) {
  return this.productCategoriesService.findAll(organizationId);
}

  @ApiOperation({
    summary: 'Get product category by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Product category found.',
  })
  @ApiResponse({
    status: 404,
    description: 'Product category not found.',
  })
  @Permissions('product-categories.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.productCategoriesService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update product category',
  })
  @ApiResponse({
    status: 200,
    description: 'Product category updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Product category not found.',
  })
  @Permissions('product-categories.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    return this.productCategoriesService.update(
      id,
      updateProductCategoryDto,
    );
  }

  @ApiOperation({
    summary: 'Deactivate product category',
  })
  @ApiResponse({
    status: 200,
    description: 'Product category deactivated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Product category not found.',
  })
  @Permissions('product-categories.delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.productCategoriesService.remove(id);
  }
}
