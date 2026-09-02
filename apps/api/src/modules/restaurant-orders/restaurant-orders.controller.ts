import {
  Body,
  Controller,
  Delete,
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

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { CreateRestaurantOrderDto } from './dto/create-restaurant-order.dto';
import { RestaurantOrdersService } from './restaurant-orders.service';

@ApiTags('Restaurant Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('restaurant-orders')
export class RestaurantOrdersController {
  constructor(
    private readonly restaurantOrdersService: RestaurantOrdersService,
  ) {}

  @Post('tables/:tableId')
  @Permissions('sales.create')
  @ApiOperation({ summary: 'Add items or create draft order for a restaurant table' })
  @ApiResponse({ status: 201, description: 'Order updated or created successfully.' })
  @ApiResponse({ status: 404, description: 'Table or product not found.' })
  async addItems(
    @Param('tableId') tableId: string,
    @Body() dto: CreateRestaurantOrderDto,
  ) {
    return this.restaurantOrdersService.addItemsToTable(tableId, dto);
  }

  @Get('tables/:tableId/current')
  @Permissions('sales.read')
  @ApiOperation({ summary: 'Get current active draft order for a table' })
  @ApiResponse({ status: 200, description: 'Current active sale draft for the table.' })
  @ApiResponse({ status: 404, description: 'Table not found or no active order.' })
  async getCurrentOrder(@Param('tableId') tableId: string) {
    return this.restaurantOrdersService.getCurrentOrder(tableId);
  }

  @Delete('items/:itemId')
  @Permissions('sales.update')
  @ApiOperation({ summary: 'Remove an item from active table order' })
  @ApiResponse({ status: 200, description: 'Item removed and order total recalculated.' })
  @ApiResponse({ status: 404, description: 'Order item not found.' })
  async removeItem(@Param('itemId') itemId: string) {
    return this.restaurantOrdersService.removeItem(itemId);
  }
}
