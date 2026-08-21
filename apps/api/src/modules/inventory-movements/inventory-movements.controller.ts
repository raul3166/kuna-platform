import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { InventoryMovementsService } from './inventory-movements.service';

import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Inventory Movements')
@ApiBearerAuth('JWT-auth')
@Controller('inventory-movements')
export class InventoryMovementsController {
  constructor(
    private readonly inventoryMovementsService: InventoryMovementsService,
  ) {}

  @ApiOperation({
    summary: 'Create inventory movement',
  })
  @ApiResponse({
    status: 201,
    description: 'Inventory movement created successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Organization or Product not found.',
  })
  @Permissions('inventory-movements.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(
    @Body()
    createInventoryMovementDto: CreateInventoryMovementDto,
  ) {
    return this.inventoryMovementsService.create(
      createInventoryMovementDto,
    );
  }

  @ApiOperation({
    summary: 'Get all inventory movements',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory movements list.',
  })
  @Permissions('inventory-movements.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll() {
    return this.inventoryMovementsService.findAll();
  }

  @ApiOperation({
  summary: 'Create inventory stock adjustment',
  description:
    'Adjusts the product stock using the physical stock count.',
})
@ApiResponse({
  status: 201,
  description: 'Inventory adjustment created successfully.',
})
@ApiResponse({
  status: 400,
  description:
    'Invalid adjustment or adjustment does not change stock.',
})
@ApiResponse({
  status: 404,
  description:
    'Organization or Product not found.',
})
@Permissions('inventory-movements.adjustment')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Post('adjustment')
createAdjustment(
  @Body()
  createInventoryAdjustmentDto: CreateInventoryAdjustmentDto,
) {
  return this.inventoryMovementsService.createAdjustment(
    createInventoryAdjustmentDto,
  );
}

  @ApiOperation({
    summary: 'Get inventory movement by id',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory movement found.',
  })
  @ApiResponse({
    status: 404,
    description: 'Inventory movement not found.',
  })
  @Permissions('inventory-movements.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.inventoryMovementsService.findOne(id);
  }

  @Get('product/:productId')
@Permissions('inventory-movements.read')
@UseGuards(JwtAuthGuard, PermissionsGuard)
findByProduct(
  @Param('productId') productId: string,
) {
  return this.inventoryMovementsService.findByProduct(
    productId,
  );
}


}
