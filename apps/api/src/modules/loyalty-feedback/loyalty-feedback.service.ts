import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class LoyaltyFeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveOrganizationBySlugOrId(slugOrId: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        isActive: true,
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
    });
    if (!org) {
      throw new NotFoundException('Organización no encontrada');
    }
    return org;
  }

  /**
   * Ajustar puntos de fidelidad de un cliente (Sumar o Redimir)
   */
  async adjustCustomerPoints(params: {
    organizationId: string;
    customerId: string;
    pointsDelta: number;
    reason?: string;
  }) {
    if (!params.organizationId || !params.customerId) {
      throw new BadRequestException('organizationId y customerId son requeridos');
    }

    const delta = Number(params.pointsDelta || 0);
    if (!Number.isFinite(delta) || delta === 0) {
      throw new BadRequestException('La cantidad de puntos a sumar o redimir debe ser distinta de 0');
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: params.customerId,
        organizationId: params.organizationId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Cliente no encontrado en la organización');
    }

    const currentPoints = Number(customer.loyaltyPoints || 0);
    const newPoints = Math.max(0, currentPoints + delta);

    if (delta < 0 && Math.abs(delta) > currentPoints) {
      throw new BadRequestException(
        `El cliente solo dispone de ${currentPoints} puntos para redimir.`,
      );
    }

    const stamp = new Date().toLocaleDateString('es-CO');
    const actionLabel = delta > 0 ? `+${delta} pts` : `${delta} pts (Redención)`;
    const noteEntry = `[${stamp}] Fidelidad: ${actionLabel}${params.reason ? ` (${params.reason.trim()})` : ''}`;
    const updatedNotes = [customer.notes, noteEntry].filter(Boolean).join(' | ');

    return this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        loyaltyPoints: newPoints,
        notes: updatedNotes,
      },
    });
  }

  /**
   * Registrar calificación / reseña de 1 a 5 estrellas (Admin o Portal Público)
   */
  async createFeedback(payload: {
    organizationId?: string;
    slug?: string;
    branchId?: string;
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
  }) {
    let orgId = payload.organizationId;
    if (!orgId && payload.slug) {
      const org = await this.resolveOrganizationBySlugOrId(payload.slug);
      orgId = org.id;
    }

    if (!orgId) {
      throw new BadRequestException('organizationId o slug es requerido');
    }

    const rating = Math.min(5, Math.max(1, Number(payload.rating || 5)));

    let customerId = payload.customerId || null;
    let resolvedName = payload.customerName?.trim() || 'Cliente';

    if (!customerId && payload.customerIdentifier) {
      const clean = payload.customerIdentifier.trim();
      if (clean) {
        const found = await this.prisma.customer.findFirst({
          where: {
            organizationId: orgId,
            OR: [
              { identificationNumber: { equals: clean, mode: 'insensitive' } },
              { email: { equals: clean, mode: 'insensitive' } },
              { phoneNumber: { equals: clean } },
            ],
          },
        });
        if (found) {
          customerId = found.id;
          resolvedName = [found.firstName, found.lastName].filter(Boolean).join(' ');
        }
      }
    } else if (customerId) {
      const found = await this.prisma.customer.findFirst({
        where: { id: customerId, organizationId: orgId },
      });
      if (found) {
        resolvedName = [found.firstName, found.lastName].filter(Boolean).join(' ');
      }
    }

    const isAnonymous = Boolean(payload.isAnonymous);

    const feedback = await this.prisma.customerFeedback.create({
      data: {
        organizationId: orgId,
        branchId: payload.branchId || null,
        customerId,
        customerName: isAnonymous ? 'Cliente Anónimo' : resolvedName,
        verticalCode: payload.verticalCode || 'CORE',
        sourceType: payload.sourceType || 'GENERAL',
        sourceId: payload.sourceId || null,
        subjectName: payload.subjectName?.trim() || 'Experiencia General',
        staffName: payload.staffName?.trim() || null,
        rating,
        comment: payload.comment?.trim() || null,
        isAnonymous,
      },
    });

    // Bonificar +10 puntos de fidelidad al cliente por dejar su calificación
    if (customerId) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          loyaltyPoints: { increment: 10 },
        },
      });
    }

    return feedback;
  }

  /**
   * Dashboard consolidado de Fidelización (Top Clientes con Puntos) + Reseñas CSAT (CustomerFeedback + StudioClassFeedback)
   */
  async getLoyaltyAndCsatDashboard(params: {
    organizationId: string;
    verticalCode?: string;
    rating?: number;
  }) {
    if (!params.organizationId) {
      throw new BadRequestException('organizationId es requerido');
    }

    const [customers, coreFeedbacks, studioFeedbacks] = await Promise.all([
      this.prisma.customer.findMany({
        where: {
          organizationId: params.organizationId,
          isActive: true,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          identificationType: true,
          identificationNumber: true,
          email: true,
          phoneNumber: true,
          loyaltyPoints: true,
          medicalAlerts: true,
        },
        orderBy: [{ loyaltyPoints: 'desc' }, { firstName: 'asc' }],
      }),
      this.prisma.customerFeedback.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.verticalCode && params.verticalCode !== 'ALL'
            ? { verticalCode: params.verticalCode }
            : {}),
          ...(params.rating ? { rating: Number(params.rating) } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.studioClassFeedback.findMany({
        where: {
          organizationId: params.organizationId,
          ...(params.rating ? { rating: Number(params.rating) } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    // Unificar reseñas de StudioClassFeedback con CustomerFeedback para vista 360°
    const normalizedStudio =
      !params.verticalCode || params.verticalCode === 'ALL' || params.verticalCode === 'STUDIO'
        ? studioFeedbacks.map((sf) => ({
            id: `studio-${sf.id}`,
            organizationId: sf.organizationId,
            customerId: sf.customerId,
            customerName: sf.isAnonymous ? 'Alumno Anónimo' : sf.customerName,
            verticalCode: 'STUDIO',
            sourceType: 'STUDIO_CLASS',
            subjectName: sf.className,
            staffName: sf.instructorName,
            rating: sf.rating,
            comment: sf.comment,
            isAnonymous: sf.isAnonymous,
            createdAt: sf.createdAt,
          }))
        : [];

    const allFeedbacks = [...coreFeedbacks, ...normalizedStudio].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const totalReviews = allFeedbacks.length;
    const averageRating =
      totalReviews > 0
        ? Math.round(
            (allFeedbacks.reduce((sum, f) => sum + Number(f.rating || 5), 0) / totalReviews) * 100,
          ) / 100
        : 0;

    const starDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const f of allFeedbacks) {
      const r = Math.min(5, Math.max(1, Number(f.rating || 5)));
      starDistribution[r] = (starDistribution[r] || 0) + 1;
    }

    const totalPointsIssued = customers.reduce(
      (sum, c) => sum + Number(c.loyaltyPoints || 0),
      0,
    );
    const customersWithPoints = customers.filter((c) => Number(c.loyaltyPoints || 0) > 0).length;

    return {
      loyaltySummary: {
        totalCustomers: customers.length,
        customersWithPoints,
        totalPointsCirculating: totalPointsIssued,
        estimatedRedemptionValueCop: totalPointsIssued * 50, // Equivalencia referencial: 1 pto = $50 COP (5% cashback)
      },
      csatSummary: {
        totalReviews,
        averageRating,
        starDistribution,
        satisfactionPct:
          totalReviews > 0
            ? Math.round(
                (((starDistribution[5] || 0) + (starDistribution[4] || 0)) / totalReviews) * 100,
              )
            : 100,
      },
      customers,
      feedbacks: allFeedbacks,
    };
  }
}

