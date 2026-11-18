import { Controller, Get, Post, Patch, Param, Query, Body } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicPortalService } from './public-portal.service';

@ApiTags('Universal Public Customer & Live Tracking Portal (Core)')
@Controller('public-portal')
export class PublicPortalController {
  constructor(private readonly publicPortalService: PublicPortalService) {}

  @ApiOperation({ summary: 'Get public organization catalog (branches, active verticals, services, specialists)' })
  @Get('catalog/:slug')
  getCatalog(@Param('slug') slug: string) {
    return this.publicPortalService.getPublicCatalog(slug);
  }

  @ApiOperation({ summary: 'Track live orders, laundry tickets, pets vaccination card, appointments or vehicles by ID/Plate/Ticket' })
  @Get('track/:slug')
  trackCustomerOrOrder(
    @Param('slug') slug: string,
    @Query('q') q: string,
  ) {
    return this.publicPortalService.trackCustomerOrOrder(slug, q);
  }

  @ApiOperation({ summary: 'Book a public appointment online (Beauty, Spa, Veterinary, Automotive, Services)' })
  @Post('appointments/:slug')
  createPublicAppointment(
    @Param('slug') slug: string,
    @Body()
    body: {
      branchId?: string;
      serviceItemId: string;
      workerId?: string;
      appointmentDate: string;
      appointmentTime: string;
      customerId?: string;
      firstName?: string;
      lastName?: string;
      identificationType?: string;
      identificationNumber?: string;
      email?: string;
      phoneNumber?: string;
      notes?: string;
    },
  ) {
    return this.publicPortalService.createPublicAppointment(slug, body);
  }

  @ApiOperation({ summary: 'Cancel a scheduled appointment from public portal' })
  @Patch('appointments/:slug/:appointmentId/cancel')
  cancelPublicAppointment(
    @Param('slug') slug: string,
    @Param('appointmentId') appointmentId: string,
    @Body() body: { customerId: string; reason?: string },
  ) {
    return this.publicPortalService.cancelPublicAppointment(
      slug,
      appointmentId,
      body.customerId,
      body.reason,
    );
  }
}
