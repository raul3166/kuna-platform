import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  RetailSubtype,
  UpdateRetailConfigDto,
} from './dto/update-retail-config.dto';

@Injectable()
export class RetailService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resuelve el ID de organización con soporte a fallback por usuario o tenant activo
   */
  private async resolveOrganizationId(
    organizationId?: string,
    userId?: string,
  ): Promise<string> {
    if (organizationId) {
      return organizationId;
    }

    if (userId) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (dbUser?.organizationId) {
        return dbUser.organizationId;
      }
    }

    const firstOrg = await this.prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
    });

    if (firstOrg?.id) {
      return firstOrg.id;
    }

    throw new BadRequestException(
      'No se pudo determinar la organización activa.',
    );
  }

  /**
   * Obtiene las métricas operativas de mostrador/tienda en tiempo real
   */
  async getDashboard(
    organizationId?: string,
    branchId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Ventas confirmadas de hoy
    const todaySales = await this.prisma.sale.findMany({
      where: {
        organizationId: orgId,
        ...(branchId ? { branchId } : {}),
        status: 'CONFIRMED',
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        payments: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    const totalSalesToday = todaySales.reduce(
      (sum, s) => sum + Number(s.total || 0),
      0,
    );
    const transactionsToday = todaySales.length;
    const averageTicketToday =
      transactionsToday > 0 ? totalSalesToday / transactionsToday : 0;

    // 2. Desglose de cobros de hoy por método de pago
    const paymentsBreakdown: Record<string, number> = {
      CASH: 0,
      CREDIT_CARD: 0,
      DEBIT_CARD: 0,
      TRANSFER: 0,
      CREDIT: 0,
    };

    todaySales.forEach((sale) => {
      sale.payments.forEach((p) => {
        const method = p.method as string;
        paymentsBreakdown[method] =
          (paymentsBreakdown[method] || 0) + Number(p.amount || 0);
      });
    });

    // 3. Top 5 productos más vendidos del día
    const productStatsMap = new Map<
      string,
      { id: string; name: string; sku: string; quantity: number; totalRevenue: number }
    >();

    todaySales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!item.product) return;
        const current = productStatsMap.get(item.productId) || {
          id: item.productId,
          name: item.product.name,
          sku: item.product.sku,
          quantity: 0,
          totalRevenue: 0,
        };
        current.quantity += item.quantity;
        current.totalRevenue += Number(item.total || 0);
        productStatsMap.set(item.productId, current);
      });
    });

    const topSellingToday = Array.from(productStatsMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 4. Estado de la caja registradora de turno
    const activeCashSession = await this.prisma.cashSession.findFirst({
      where: {
        organizationId: orgId,
        ...(branchId ? { branchId } : {}),
        status: 'OPEN',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { openingDate: 'desc' },
    });

    // 5. Alertas de inventario bajo en la sucursal (stock <= 5 unidades)
    const lowStockAlerts = await this.prisma.branchProductStock.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        product: {
          organizationId: orgId,
          isActive: true,
        },
        stock: {
          lte: 5,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            barcode: true,
            salePrice: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { stock: 'asc' },
      take: 6,
    });

    return {
      today: {
        totalSales: totalSalesToday,
        transactions: transactionsToday,
        averageTicket: averageTicketToday,
        paymentsBreakdown,
      },
      activeCashSession: activeCashSession
        ? {
            id: activeCashSession.id,
            status: activeCashSession.status,
            openingDate: activeCashSession.openingDate,
            openingBalance: Number(activeCashSession.openingBalance),
            cashier: `${activeCashSession.user.firstName} ${activeCashSession.user.lastName}`,
            branchName: activeCashSession.branch.name,
          }
        : null,
      topSellingToday,
      lowStockAlerts: lowStockAlerts.map((ls) => ({
        productId: ls.productId,
        name: ls.product.name,
        sku: ls.product.sku,
        barcode: ls.product.barcode,
        salePrice: Number(ls.product.salePrice),
        currentStock: Number(ls.stock),
        branchName: ls.branch.name,
      })),
    };
  }

  /**
   * Obtiene la configuración específica de Retail para la organización
   */
  async getConfig(organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'RETAIL' },
    });

    if (!vertical) {
      throw new NotFoundException('El vertical RETAIL no está registrado en el catálogo maestro.');
    }

    const orgVertical = await this.prisma.organizationVertical.findUnique({
      where: {
        organizationId_verticalId: {
          organizationId: orgId,
          verticalId: vertical.id,
        },
      },
    });

    const defaultConfig = {
      subtype: RetailSubtype.GENERAL,
      enableBarcodeScanner: true,
      allowNegativeStock: false,
      requireCustomerOnCheckout: false,
      defaultPaymentMethod: 'CASH',
      receiptFooterNote: '¡Gracias por su compra! Conserve este recibo para garantías.',
    };

    return {
      organizationId: orgId,
      isActive: orgVertical?.isActive ?? false,
      config: {
        ...defaultConfig,
        ...((orgVertical?.config as object) || {}),
      },
    };
  }

  /**
   * Actualiza la configuración específica de Retail para la organización
   */
  async updateConfig(
    organizationId: string | undefined,
    dto: UpdateRetailConfigDto,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'RETAIL' },
    });

    if (!vertical) {
      throw new NotFoundException('El vertical RETAIL no existe.');
    }

    const current = await this.getConfig(orgId, userId);
    const updatedConfig = {
      ...current.config,
      ...dto,
    };

    const saved = await this.prisma.organizationVertical.upsert({
      where: {
        organizationId_verticalId: {
          organizationId: orgId,
          verticalId: vertical.id,
        },
      },
      update: {
        config: updatedConfig,
      },
      create: {
        organizationId: orgId,
        verticalId: vertical.id,
        isActive: true,
        config: updatedConfig,
      },
    });

    return {
      message: 'Configuración de Retail actualizada exitosamente.',
      config: saved.config,
    };
  }
}

