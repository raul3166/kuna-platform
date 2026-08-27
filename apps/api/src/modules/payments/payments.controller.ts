import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiOperation({ summary: 'Register a customer payment for a sale' })
  @ApiResponse({ status: 201, description: 'Payment registered successfully.' })
  @Post()
  @Permissions('payments.create')
  async create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  @ApiOperation({ summary: 'Get all payments' })
  @Get()
  @Permissions('payments.read')
  async findAll() {
    return this.paymentsService.findAll();
  }

  @ApiOperation({ summary: 'Get payment by id' })
  @Get(':id')
  @Permissions('payments.read')
  async findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @ApiOperation({ summary: 'Void / Delete a payment record' })
  @Delete(':id')
  @Permissions('payments.delete')
  async remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}
