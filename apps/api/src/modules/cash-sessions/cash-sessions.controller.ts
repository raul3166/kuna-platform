import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { CashSessionsService } from './cash-sessions.service';
import { CreateCashSessionDto } from './dto/create-cash-session.dto';
import { UpdateCashSessionDto } from './dto/update-cash-session.dto'; // Mapeado a tu archivo nativo

@ApiTags('Cash Sessions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cash-sessions')
export class CashSessionsController {
  constructor(private readonly cashSessionsService: CashSessionsService) {}

  @Post('open')
  @Permissions('cash-sessions.create')
  @ApiOperation({ summary: 'Open a new cash register session/turn' })
  async open(@Body() createDto: CreateCashSessionDto) {
    return this.cashSessionsService.open(createDto);
  }

  @Patch(':id/close')
  @Permissions('cash-sessions.update')
  @ApiOperation({ summary: 'Close and audit a cash register session (Arqueo)' })
  async close(@Param('id') id: string, @Body() closeDto: UpdateCashSessionDto) {
    return this.cashSessionsService.close(id, closeDto);
  }

  @Get('active')
  @Permissions('cash-sessions.read')
  @ApiQuery({ name: 'userId', required: true })
  @ApiOperation({ summary: 'Get current active session for a user' })
  async findActive(@Query('userId') userId: string) {
    return this.cashSessionsService.findActiveSession(userId);
  }
}
