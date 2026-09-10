import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StudioSchedulesService } from './studio-schedules.service';
import { CreateStudioScheduleDto } from './dto/create-studio-schedule.dto';
import { UpdateStudioScheduleDto } from './dto/update-studio-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Studio Schedules')
@ApiBearerAuth('JWT-auth')
@Controller('studio-schedules')
export class StudioSchedulesController {
  constructor(
    private readonly studioSchedulesService: StudioSchedulesService,
  ) {}

  @ApiOperation({ summary: 'Create a new studio schedule' })
  @Permissions('studio.create')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Post()
  create(@Body() dto: CreateStudioScheduleDto) {
    return this.studioSchedulesService.create(dto);
  }

  @ApiOperation({ summary: 'Get all studio schedules' })
  @Permissions('studio.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
    @Query('date') date?: string,
  ) {
    return this.studioSchedulesService.findAll(organizationId, branchId, date);
  }

  @ApiOperation({ summary: 'Get a single studio schedule by id' })
  @Permissions('studio.read')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studioSchedulesService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a studio schedule' })
  @Permissions('studio.update')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStudioScheduleDto) {
    return this.studioSchedulesService.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete a studio schedule' })
  @Permissions('studio.delete')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studioSchedulesService.remove(id);
  }
}
