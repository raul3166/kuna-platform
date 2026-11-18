import { Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OperatingExpensesService } from './operating-expenses.service';
import { CreateOperatingExpenseDto } from './dto/create-operating-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Operating Expenses & Cash Flow (Core)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('operating-expenses')
export class OperatingExpensesController {
  constructor(private readonly operatingExpensesService: OperatingExpensesService) {}

  @ApiOperation({ summary: 'Register a new operating expense' })
  @Post()
  create(@Body() dto: CreateOperatingExpenseDto) {
    return this.operatingExpensesService.create(dto);
  }

  @ApiOperation({ summary: 'List operating expenses with filters' })
  @Get()
  findAll(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.operatingExpensesService.findAll({
      organizationId,
      branchId,
      category,
      status,
      from,
      to,
    });
  }

  @ApiOperation({ summary: 'Get real cash flow and net profit summary across verticals' })
  @Get('summary')
  getCashFlowSummary(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.operatingExpensesService.getCashFlowSummary({
      organizationId,
      branchId,
      from,
      to,
    });
  }

  @ApiOperation({ summary: 'Update operating expense status (e.g. mark PENDING as PAID)' })
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
    @Body() body: { status: string; paymentMethod?: string; reference?: string },
  ) {
    return this.operatingExpensesService.updateStatus(
      id,
      organizationId,
      body.status,
      body.paymentMethod,
      body.reference,
    );
  }

  @ApiOperation({ summary: 'Delete an operating expense' })
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('organizationId') organizationId: string,
  ) {
    return this.operatingExpensesService.remove(id, organizationId);
  }
}

