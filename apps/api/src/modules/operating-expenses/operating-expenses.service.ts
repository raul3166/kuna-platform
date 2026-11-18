import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateOperatingExpenseDto } from './dto/create-operating-expense.dto';

@Injectable()
export class OperatingExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  private parseLocalDate(dateStr?: string): Date {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
  }

  async create(dto: CreateOperatingExpenseDto) {
    if (!dto.organizationId) {
      throw new BadRequestException('organizationId es requerido');
    }
    if (!dto.description || !dto.description.trim()) {
      throw new BadRequestException('La descripción del gasto es obligatoria');
    }
    if (Number(dto.amount) <= 0) {
      throw new BadRequestException('El monto del gasto debe ser mayor a 0');
    }

    const count = await this.prisma.operatingExpense.count({
      where: { organizationId: dto.organizationId },
    });
    const year = new Date().getFullYear();
    const expenseNumber = `EGR-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.operatingExpense.create({
      data: {
        organizationId: dto.organizationId,
        branchId: dto.branchId || null,
        expenseNumber,
        category: dto.category || 'OTHER',
        description: dto.description.trim(),
        beneficiaryName: dto.beneficiaryName?.trim() || null,
        amount: Number(dto.amount),
        paymentMethod: dto.paymentMethod || 'TRANSFER',
        status: dto.status || 'PAID',
        expenseDate: this.parseLocalDate(dto.expenseDate),
        reference: dto.reference?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(params: {
    organizationId: string;
    branchId?: string;
    category?: string;
    status?: string;
    from?: string;
    to?: string;
  }) {
    if (!params.organizationId) {
      throw new BadRequestException('organizationId es requerido');
    }

    const where: any = {
      organizationId: params.organizationId,
    };

    if (params.branchId && params.branchId !== 'ALL') {
      where.branchId = params.branchId;
    }
    if (params.category && params.category !== 'ALL') {
      where.category = params.category;
    }
    if (params.status && params.status !== 'ALL') {
      where.status = params.status;
    }
    if (params.from || params.to) {
      where.expenseDate = {};
      if (params.from) {
        const [y, m, d] = params.from.split('-').map(Number);
        where.expenseDate.gte = new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
      }
      if (params.to) {
        const [y, m, d] = params.to.split('-').map(Number);
        where.expenseDate.lte = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
      }
    }

    return this.prisma.operatingExpense.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
      },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async updateStatus(id: string, organizationId: string, status: string, paymentMethod?: string, reference?: string) {
    const existing = await this.prisma.operatingExpense.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException('Gasto operativo no encontrado');
    }

    return this.prisma.operatingExpense.update({
      where: { id },
      data: {
        status,
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(reference ? { reference } : {}),
      },
      include: {
        branch: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string, organizationId: string) {
    const existing = await this.prisma.operatingExpense.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException('Gasto operativo no encontrado');
    }

    return this.prisma.operatingExpense.delete({
      where: { id },
    });
  }

  /**
   * Estado de Resultados y Flujo de Caja Real Transversal (14 Verticales)
   * Consolida todos los ingresos de la organización vs. compras y gastos operativos.
   */
  async getCashFlowSummary(params: {
    organizationId: string;
    branchId?: string;
    from?: string;
    to?: string;
  }) {
    if (!params.organizationId) {
      throw new BadRequestException('organizationId es requerido');
    }

    const now = new Date();
    const fromDate = params.from
      ? (() => {
          const [y, m, d] = params.from.split('-').map(Number);
          return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
        })()
      : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const toDate = params.to
      ? (() => {
          const [y, m, d] = params.to.split('-').map(Number);
          return new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
        })()
      : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const branchFilter =
      params.branchId && params.branchId !== 'ALL' ? { branchId: params.branchId } : {};

    const [
      sales,
      studioSubs,
      gymSubs,
      serviceOrders,
      hotelReservations,
      purchaseInvoices,
      operatingExpenses,
    ] = await Promise.all([
      // 1. Ventas POS / Facturación general (incluye Checkout de Hotel, Restaurante, Retail, etc.)
      this.prisma.sale.findMany({
        where: {
          organizationId: params.organizationId,
          ...branchFilter,
          status: 'CONFIRMED',
          createdAt: { gte: fromDate, lte: toDate },
        },
        select: { id: true, total: true },
      }),
      // 2. Suscripciones y Abonos de Studio (Yoga/Pilates/Barre)
      this.prisma.studioSubscription.findMany({
        where: {
          organizationId: params.organizationId,
          ...branchFilter,
          status: { not: 'CANCELLED' },
          createdAt: { gte: fromDate, lte: toDate },
        },
        include: { plan: { select: { price: true } } },
      }),
      // 3. Membresías de Gimnasio (Pagos totales y abonos parciales)
      this.prisma.gymSubscription.findMany({
        where: {
          organizationId: params.organizationId,
          ...branchFilter,
          status: { not: 'CANCELLED' },
          createdAt: { gte: fromDate, lte: toDate },
        },
        include: { plan: { select: { price: true } } },
      }),
      // 4. Órdenes de Servicio completadas sin factura Sale asociada (para no duplicar con POS)
      this.prisma.serviceOrder.findMany({
        where: {
          organizationId: params.organizationId,
          ...branchFilter,
          status: 'COMPLETED',
          saleId: null,
          createdAt: { gte: fromDate, lte: toDate },
        },
        select: { id: true, total: true },
      }),
      // 5. Reservas de Hotel activas/finalizadas sin factura Sale asociada (para no duplicar con Checkout POS)
      this.prisma.hotelReservation.findMany({
        where: {
          organizationId: params.organizationId,
          ...branchFilter,
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
          saleId: null,
          createdAt: { gte: fromDate, lte: toDate },
        },
        select: { id: true, totalAmount: true },
      }),
      // 6. Facturas de Compra de Inventario / Proveedores
      this.prisma.purchaseInvoice.findMany({
        where: {
          organizationId: params.organizationId,
          status: { not: 'CANCELLED' },
          createdAt: { gte: fromDate, lte: toDate },
        },
        select: { id: true, total: true },
      }),
      // 7. Gastos Operativos del período
      this.prisma.operatingExpense.findMany({
        where: {
          organizationId: params.organizationId,
          ...branchFilter,
          status: { not: 'CANCELLED' },
          expenseDate: { gte: fromDate, lte: toDate },
        },
      }),
    ]);

    const salesIncome = sales.reduce((sum, s) => sum + Number(s.total || 0), 0);

    const studioIncome = studioSubs.reduce((sum, sub) => {
      const paid = Number(sub.paidAmount || 0);
      if (paid > 0) return sum + paid;
      if (sub.paymentStatus === 'PAID') {
        return sum + Number(sub.totalAmount || sub.plan?.price || 0);
      }
      return sum;
    }, 0);

    const studioPendingReceivable = studioSubs.reduce(
      (sum, sub) => sum + Number(sub.balanceAmount || 0),
      0,
    );

    const gymIncome = gymSubs.reduce((sum, g) => {
      const paid = Number(g.paidAmount || 0);
      if (paid > 0) return sum + paid;
      if (g.paymentStatus === 'PAID') {
        return sum + Number(g.totalAmount || g.plan?.price || 0);
      }
      return sum;
    }, 0);
    const gymPendingReceivable = gymSubs.reduce(
      (sum, g) => sum + Number(g.balanceAmount || 0),
      0,
    );
    const serviceOrdersIncome = serviceOrders.reduce((sum, so) => sum + Number(so.total || 0), 0);
    const hotelDirectIncome = hotelReservations.reduce(
      (sum, hr) => sum + Number(hr.totalAmount || 0),
      0,
    );

    const totalIncome =
      salesIncome + studioIncome + gymIncome + serviceOrdersIncome + hotelDirectIncome;

    const totalPurchases = purchaseInvoices.reduce((sum, pi) => sum + Number(pi.total || 0), 0);

    let paidExpenses = 0;
    let pendingExpenses = 0;
    const byCategory: Record<string, { category: string; count: number; total: number }> = {};

    for (const exp of operatingExpenses) {
      const amt = Number(exp.amount || 0);
      if (exp.status === 'PENDING') {
        pendingExpenses += amt;
      } else {
        paidExpenses += amt;
      }

      const cat = exp.category || 'OTHER';
      if (!byCategory[cat]) {
        byCategory[cat] = { category: cat, count: 0, total: 0 };
      }
      byCategory[cat].count += 1;
      byCategory[cat].total += amt;
    }

    const totalOperatingExpenses = paidExpenses + pendingExpenses;
    const netOperatingProfit = totalIncome - totalOperatingExpenses - totalPurchases;
    const profitMarginPct =
      totalIncome > 0 ? Math.round((netOperatingProfit / totalIncome) * 1000) / 10 : 0;

    return {
      period: {
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
      },
      incomeBreakdown: {
        salesPos: salesIncome,
        studioPackages: studioIncome,
        gymMemberships: gymIncome,
        serviceOrders: serviceOrdersIncome,
        hotelReservations: hotelDirectIncome,
        totalIncome,
        pendingReceivables: studioPendingReceivable + gymPendingReceivable,
      },
      outflowBreakdown: {
        paidOperatingExpenses: paidExpenses,
        pendingOperatingExpenses: pendingExpenses,
        totalOperatingExpenses,
        inventoryPurchases: totalPurchases,
        totalOutflows: totalOperatingExpenses + totalPurchases,
      },
      netResult: {
        netProfit: netOperatingProfit,
        profitMarginPct,
      },
      expensesByCategory: Object.values(byCategory).sort((a, b) => b.total - a.total),
    };
  }
}

