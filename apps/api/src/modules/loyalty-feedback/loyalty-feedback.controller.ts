import { Controller, Get, Post, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoyaltyFeedbackService } from './loyalty-feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Loyalty & Customer Feedback CSAT (Core)')
@Controller('loyalty-feedback')
export class LoyaltyFeedbackController {
  constructor(private readonly loyaltyFeedbackService: LoyaltyFeedbackService) {}

  @ApiOperation({ summary: 'Get 360 Loyalty points & CSAT Feedback dashboard' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('dashboard')
  getDashboard(
    @Query('organizationId') organizationId: string,
    @Query('verticalCode') verticalCode?: string,
    @Query('rating') rating?: string,
  ) {
    return this.loyaltyFeedbackService.getLoyaltyAndCsatDashboard({
      organizationId,
      verticalCode,
      rating: rating ? Number(rating) : undefined,
    });
  }

  @ApiOperation({ summary: 'Adjust customer loyalty points (award or redeem points)' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Patch('customers/:customerId/points')
  adjustPoints(
    @Param('customerId') customerId: string,
    @Body()
    body: {
      organizationId: string;
      pointsDelta: number;
      reason?: string;
    },
  ) {
    return this.loyaltyFeedbackService.adjustCustomerPoints({
      organizationId: body.organizationId,
      customerId,
      pointsDelta: Number(body.pointsDelta),
      reason: body.reason,
    });
  }

  @ApiOperation({ summary: 'Register customer feedback (authenticated admin)' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Post('feedback')
  createFeedback(
    @Body()
    body: {
      organizationId: string;
      branchId?: string;
      customerId?: string;
      customerName?: string;
      verticalCode?: string;
      sourceType?: string;
      sourceId?: string;
      subjectName?: string;
      staffName?: string;
      rating: number;
      comment?: string;
      isAnonymous?: boolean;
    },
  ) {
    return this.loyaltyFeedbackService.createFeedback(body);
  }

  @ApiOperation({ summary: 'Public customer feedback submission (from Hotel Portal or Public Link)' })
  @Post('public/feedback/:slug')
  createPublicFeedback(
    @Param('slug') slug: string,
    @Body()
    body: {
      customerId?: string;
      customerIdentifier?: string;
      customerName?: string;
      verticalCode?: string;
      sourceType?: string;
      sourceId?: string;
      subjectName?: string;
      staffName?: string;
      rating: number;
      comment?: string;
      isAnonymous?: boolean;
    },
  ) {
    return this.loyaltyFeedbackService.createFeedback({
      ...body,
      slug,
    });
  }
}

