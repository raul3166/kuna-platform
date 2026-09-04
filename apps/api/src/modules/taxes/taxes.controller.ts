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

import { TaxesService } from './taxes.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Taxes')
@ApiBearerAuth('JWT-auth')
@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @ApiOperation({ summary: 'Create a new tax rule' })
  @ApiResponse({ status: 201, description: 'Tax rule created successfully.' })
  @ApiResponse({ status: 404, description: 'Organization not found.' })
  @ApiResponse({ status: 409, description: 'Tax code already exists.' })
  @Permissions('taxes.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() createTaxDto: CreateTaxDto) {
    return this.taxesService.create(createTaxDto);
  }

  @ApiOperation({ summary: 'Get all active tax rules' })
  @ApiResponse({ status: 200, description: 'List of active tax rules.' })
  @Permissions('taxes.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll() {
    return this.taxesService.findAll();
  }

  @ApiOperation({ summary: 'Get tax rule by id' })
  @ApiResponse({ status: 200, description: 'Tax rule found.' })
  @ApiResponse({ status: 404, description: 'Tax rule not found.' })
  @Permissions('taxes.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taxesService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a tax rule' })
  @ApiResponse({ status: 200, description: 'Tax rule updated successfully.' })
  @ApiResponse({ status: 404, description: 'Tax rule not found.' })
  @ApiResponse({ status: 409, description: 'Tax code already exists.' })
  @Permissions('taxes.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaxDto: UpdateTaxDto) {
    return this.taxesService.update(id, updateTaxDto);
  }

  @ApiOperation({ summary: 'Deactivate a tax rule' })
  @ApiResponse({ status: 200, description: 'Tax rule deactivated successfully.' })
  @ApiResponse({ status: 404, description: 'Tax rule not found.' })
  @Permissions('taxes.delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.taxesService.remove(id);
  }
}
