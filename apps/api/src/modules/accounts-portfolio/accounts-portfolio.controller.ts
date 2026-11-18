import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccountsPortfolioService } from './accounts-portfolio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Accounts Receivable (CxC) & Accounts Payable (CxP) Portfolio (Core)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('accounts-portfolio')
export class AccountsPortfolioController {
  constructor(private readonly portfolioService: AccountsPortfolioService) {}

  @ApiOperation({ summary: 'Get 360 Accounts Receivable (CxC) and Accounts Payable (CxP) aging dashboard' })
  @Get('dashboard')
  getDashboard(
    @Query('organizationId') organizationId: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.portfolioService.getPortfolioDashboard(organizationId, branchId);
  }

  @ApiOperation({ summary: 'Record a partial or full payment on any Account Receivable (Sale, ServiceOrder, Studio, Gym)' })
  @Post('receivables/pay')
  payReceivable(
    @Body()
    body: {
      organizationId: string;
      sourceType: 'SALE' | 'SERVICE_ORDER' | 'STUDIO_SUBSCRIPTION' | 'GYM_SUBSCRIPTION';
      sourceId: string;
      amount: number;
      paymentMethod?: string;
      notes?: string;
    },
  ) {
    return this.portfolioService.recordReceivablePayment(body);
  }

  @ApiOperation({ summary: 'Record a partial or full payment on any Account Payable (PurchaseInvoice, OperatingExpense)' })
  @Post('payables/pay')
  payPayable(
    @Body()
    body: {
      organizationId: string;
      sourceType: 'PURCHASE_INVOICE' | 'OPERATING_EXPENSE';
      sourceId: string;
      amount: number;
      paymentMethod?: string;
      notes?: string;
    },
  ) {
    return this.portfolioService.recordPayablePayment(body);
  }
}

