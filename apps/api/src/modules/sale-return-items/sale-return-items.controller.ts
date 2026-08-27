import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { SaleReturnItemsService } from './sale-return-items.service';
import { CreateSaleReturnItemDto } from './dto/create-sale-return-item.dto';
import { UpdateSaleReturnItemDto } from './dto/update-sale-return-item.dto';

@ApiTags('Sale Return Items')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sale-return-items')
export class SaleReturnItemsController {
  constructor(private readonly saleReturnItemsService: SaleReturnItemsService) {}

  @Post()
  @Permissions('sale-return-items.create')
  @ApiOperation({ summary: 'Add an item to a draft sale return' })
  async create(@Body() createSaleReturnItemDto: CreateSaleReturnItemDto) {
    return this.saleReturnItemsService.create(createSaleReturnItemDto);
  }

  @Get()
  @Permissions('sale-return-items.read')
  async findAll() {
    return this.saleReturnItemsService.findAll();
  }

  @Get(':id')
  @Permissions('sale-return-items.read')
  async findOne(@Param('id') id: string) {
    return this.saleReturnItemsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('sale-return-items.update')
  async update(@Param('id') id: string, @Body() updateSaleReturnItemDto: UpdateSaleReturnItemDto) {
    return this.saleReturnItemsService.update(id, updateSaleReturnItemDto);
  }

  @Delete(':id')
  @Permissions('sale-return-items.delete')
  async remove(@Param('id') id: string) {
    return this.saleReturnItemsService.remove(id);
  }
}
