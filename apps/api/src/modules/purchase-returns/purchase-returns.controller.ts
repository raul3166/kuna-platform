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

import { PurchaseReturnsService } from './purchase-returns.service';

import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { UpdatePurchaseReturnDto } from './dto/update-purchase-return.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Purchase Returns')
@ApiBearerAuth('JWT-auth')
@UseGuards(
  JwtAuthGuard,
  PermissionsGuard,
)
@Controller('purchase-returns')
export class PurchaseReturnsController {
  constructor(
    private readonly purchaseReturnsService: PurchaseReturnsService,
  ) {}

  @ApiOperation({
    summary: 'Create purchase return',
  })
  @ApiResponse({
    status: 201,
    description:
      'Purchase return created successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Organization, supplier, purchase order or goods receipt not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Purchase return number already exists or related entities do not match.',
  })
  @Permissions('purchase-returns.create')
  @Post()
  create(
    @Body()
    createPurchaseReturnDto: CreatePurchaseReturnDto,
  ) {
    return this.purchaseReturnsService.create(
      createPurchaseReturnDto,
    );
  }

  @ApiOperation({
    summary: 'Get all purchase returns',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase returns list.',
  })
  @Permissions('purchase-returns.read')
  @Get()
  findAll() {
    return this.purchaseReturnsService.findAll();
  }

  @ApiOperation({
    summary: 'Get purchase return by id',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase return found.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase return not found.',
  })
  @Permissions('purchase-returns.read')
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.purchaseReturnsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update purchase return',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase return updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase return or related entity not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Only draft purchase returns can be modified.',
  })
  @Permissions('purchase-returns.update')
  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    updatePurchaseReturnDto: UpdatePurchaseReturnDto,
  ) {
    return this.purchaseReturnsService.update(
      id,
      updatePurchaseReturnDto,
    );
  }

  @ApiOperation({
    summary: 'Confirm purchase return',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase return confirmed successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase return not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Only draft purchase returns can be confirmed.',
  })
  @Permissions('purchase-returns.confirm')
  @Patch(':id/confirm')
  confirm(
    @Param('id')
    id: string,
  ) {
    return this.purchaseReturnsService.confirm(id);
  }

  @ApiOperation({
    summary: 'Complete purchase return',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase return completed successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase return not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Only confirmed purchase returns can be completed.',
  })
  @Permissions('purchase-returns.complete')
  @Patch(':id/complete')
  complete(
    @Param('id')
    id: string,
  ) {
    return this.purchaseReturnsService.complete(id);
  }

  @ApiOperation({
    summary: 'Cancel purchase return',
  })
  @ApiResponse({
    status: 200,
    description:
      'Purchase return cancelled successfully.',
  })
  @ApiResponse({
    status: 404,
    description:
      'Purchase return not found.',
  })
  @ApiResponse({
    status: 409,
    description:
      'Only draft purchase returns can be cancelled.',
  })
  @Permissions('purchase-returns.cancel')
  @Patch(':id/cancel')
  cancel(
    @Param('id')
    id: string,
  ) {
    return this.purchaseReturnsService.cancel(id);
  }
}
