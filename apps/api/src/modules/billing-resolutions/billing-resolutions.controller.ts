import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { BillingResolutionsService } from './billing-resolutions.service';
import { CreateBillingResolutionDto } from './dto/create-billing-resolution.dto';

@ApiTags('Billing Resolutions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('billing-resolutions')
export class BillingResolutionsController {
  constructor(private readonly billingResolutionsService: BillingResolutionsService) {}

  @Post()
  @Permissions('billing-resolutions.create')
  @ApiOperation({ summary: 'Register a branch fiscal resolution' })
  async create(@Body() createDto: CreateBillingResolutionDto) {
    return this.billingResolutionsService.create(createDto);
  }

  @Get()
  @Permissions('billing-resolutions.read')
  async findAll() {
    return this.billingResolutionsService.findAll();
  }

  @Delete(':id')
  @Permissions('billing-resolutions.delete')
  async remove(@Param('id') id: string) {
    return this.billingResolutionsService.remove(id);
  }
}
