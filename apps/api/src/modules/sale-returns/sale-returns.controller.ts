import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

// CORREGIDO: Doble punto exacto para tu estructura de carpetas plana original
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { SaleReturnsService } from './sale-returns.service';
import { CreateSaleReturnDto } from './dto/create-sale-return.dto';
import { UpdateSaleReturnDto } from './dto/update-sale-return.dto';

@ApiTags('Sale Returns')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sale-returns')
export class SaleReturnsController {
  constructor(private readonly saleReturnsService: SaleReturnsService) {}

  @Post()
  @Permissions('sale-returns.create')
  @ApiOperation({ summary: 'Create a sale return header' })
  async create(@Body() createSaleReturnDto: CreateSaleReturnDto) {
    return this.saleReturnsService.create(createSaleReturnDto);
  }

  @Get()
  @Permissions('sale-returns.read')
  @ApiOperation({ summary: 'Get all active sale returns' })
  async findAll() {
    return this.saleReturnsService.findAll();
  }

  @Get(':id')
  @Permissions('sale-returns.read')
  async findOne(@Param('id') id: string) {
    return this.saleReturnsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('sale-returns.update')
  async update(@Param('id') id: string, @Body() updateSaleReturnDto: UpdateSaleReturnDto) {
    return this.saleReturnsService.update(id, updateSaleReturnDto);
  }

  @Delete(':id')
  @Permissions('sale-returns.delete')
  async remove(@Param('id') id: string) {
    return this.saleReturnsService.remove(id);
  }

  @Patch(':id/confirm')
  @Permissions('sale-returns.update')
  @ApiOperation({ summary: 'Confirm a draft return' })
  async confirm(@Param('id') id: string) {
    return this.saleReturnsService.confirm(id);
  }

  @Patch(':id/complete')
  @Permissions('sale-returns.update')
  @ApiOperation({ summary: 'Complete a return and reintegrate stock to BranchProductStock' })
  async complete(@Param('id') id: string) {
    return this.saleReturnsService.complete(id);
  }
}
