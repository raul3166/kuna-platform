import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StudioPlansService } from './studio-plans.service';
import { CreateStudioPlanDto } from './dto/create-studio-plan.dto';
import { UpdateStudioPlanDto } from './dto/update-studio-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Studio Plans')
@ApiBearerAuth('JWT-auth')
@Controller('studio-plans')
export class StudioPlansController {
  constructor(private readonly studioPlansService: StudioPlansService) {}

  @ApiOperation({ summary: 'Create a new studio plan' })
  @Permissions('studio.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() dto: CreateStudioPlanDto) {
    return this.studioPlansService.create(dto);
  }

  @ApiOperation({ summary: 'Get all studio plans' })
  @Permissions('studio.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.studioPlansService.findAll(organizationId, branchId);
  }

  @ApiOperation({ summary: 'Get a single studio plan by id' })
  @Permissions('studio.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studioPlansService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a studio plan' })
  @Permissions('studio.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStudioPlanDto) {
    return this.studioPlansService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a studio plan' })
  @Permissions('studio.delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studioPlansService.remove(id);
  }
}
