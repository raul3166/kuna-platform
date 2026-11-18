import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PaymentMethod } from '@prisma/client';

export interface ReceivableItem {
  id: string;
  sourceType: 'SALE' | 'SERVICE_ORDER' | 'STUDIO_SUBSCRIPTION' | 'GYM_SUBSCRIPTION';
  sourceLabel: string;
  documentNumber: string;
  customerId?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerDocument?: string | null;
  concept: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  issueDate: Date;
  daysOverdue: number;
  agingBucket: 'CURRENT' | 'DAYS_1_30' | 'DAYS_OVER_30';
  paymentNotes?: string | null;
}

export interface PayableItem {
  id: string;
  sourceType: 'PURCHASE_INVOICE' | 'OPERATING_EXPENSE';
  sourceLabel: string;
  documentNumber: string;
  beneficiaryName: string;
  beneficiaryPhone?: string | null;
  concept: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  issueDate: Date;
  dueDate?: Date | null;
  daysOverdue: number;
  paymentNotes?: string | null;
}

@Injectable()
export class AccountsPortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  private computeDaysElapsed(dateInput: Date | string): number {
    const d = new Date(dateInput);
    const diffMs = Date.now() - d.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  private getAgingBucket(days: number): 'CURRENT' | 'DAYS_1_30' | 'DAYS_OVER_30' {
    if (days <= 7) return 'CURRENT';
    if (days <= 30) return 'DAYS_1_30';
    return 'DAYS_OVER_30';
  }

  /**
   * Tablero Central 360° de Cartera: Cuentas por Cobrar (CxC) y Cuentas por Pagar (CxP)
   */
  async getPortfolioDashboard(organizationId: string, branchId?: string) {
    if (!organizationId) {
      throw new BadRequestException('organizationId es requerido');
    }

    const branchFilter = branchId && branchId !== 'ALL' ? { branchId } : {};

    const [
      sales,
      serviceOrders,
      studioSubs,
      gymSubs,
      purchaseInvoices,
      pendingExpenses,
    ] = await Promise.all([
      // 1. Ventas POS / Facturas confirmadas con pagos asociados
      this.prisma.sale.findMany({
        where: {
          organizationId,
          ...branchFilter,
          status: 'CONFIRMED',
        },
        include: {
          customer: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 150,
      }),
      // 2. Órdenes de Servicio (Taller, Lavandería, Veterinaria, Servicios) sin factura POS duplicada
      this.prisma.serviceOrder.findMany({
        where: {
          organizationId,
          ...branchFilter,
          status: { not: 'CANCELLED' },
          saleId: null,
        },
        include: {
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 150,
      }),
      // 3. Suscripciones de Studio con saldo pendiente
      this.prisma.studioSubscription.findMany({
        where: {
          organizationId,
          ...branchFilter,
          status: { not: 'CANCELLED' },
        },
        include: {
          customer: true,
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // 4. Membresías de Gimnasio con saldo pendiente
      this.prisma.gymSubscription.findMany({
        where: {
          organizationId,
          ...branchFilter,
          status: { not: 'CANCELLED' },
        },
        include: {
          customer: true,
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // 5. Facturas de Proveedores (CxP)
      this.prisma.purchaseInvoice.findMany({
        where: {
          organizationId,
          status: { notIn: ['CANCELLED', 'PAID'] },
        },
        include: {
          supplier: true,
        },
        orderBy: { invoiceDate: 'desc' },
      }),
      // 6. Gastos Operativos pendientes de pago (CxP)
      this.prisma.operatingExpense.findMany({
        where: {
          organizationId,
          ...branchFilter,
          status: 'PENDING',
        },
        orderBy: { expenseDate: 'desc' },
      }),
    ]);

    const receivables: ReceivableItem[] = [];

    // Procesar Ventas POS con saldo pendiente
    for (const sale of sales) {
      const total = Number(sale.total || 0);
      if (total <= 0) continue;
      const paid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      // Si la venta tiene customerId y lo pagado es menor al total, es una Cuenta por Cobrar
      if (sale.customerId && paid < total) {
        const balance = Math.max(0, total - paid);
        const days = this.computeDaysElapsed(sale.createdAt);
        receivables.push({
          id: sale.id,
          sourceType: 'SALE',
          sourceLabel: 'Factura POS / Venta',
          documentNumber: sale.saleNumber,
          customerId: sale.customerId,
          customerName: `${sale.customer?.firstName || ''} ${sale.customer?.lastName || ''}`.trim() || sale.customer?.companyName || 'Cliente',
          customerPhone: sale.customer?.phoneNumber,
          customerDocument: sale.customer?.identificationNumber,
          concept: sale.notes || `Factura de Venta ${sale.saleNumber}`,
          totalAmount: total,
          paidAmount: paid,
          balanceAmount: balance,
          issueDate: sale.createdAt,
          daysOverdue: days,
          agingBucket: this.getAgingBucket(days),
          paymentNotes: sale.notes,
        });
      }
    }

    // Procesar Órdenes de Servicio (Taller, Lavandería, Veterinaria) con saldo pendiente
    for (const so of serviceOrders) {
      const total = Number(so.total || 0);
      if (total <= 0) continue;
      const paid = Number(so.paidAmount || 0);
      const balance =
        Number(so.balanceAmount || 0) > 0
          ? Number(so.balanceAmount)
          : so.paymentStatus === 'PAID'
          ? 0
          : Math.max(0, total - paid);

      if (balance > 0) {
        const days = this.computeDaysElapsed(so.createdAt);
        receivables.push({
          id: so.id,
          sourceType: 'SERVICE_ORDER',
          sourceLabel: 'Orden de Servicio / Taller',
          documentNumber: so.orderNumber,
          customerId: so.customerId,
          customerName: `${so.customer?.firstName || ''} ${so.customer?.lastName || ''}`.trim() || so.customer?.companyName || 'Cliente',
          customerPhone: so.customer?.phoneNumber,
          customerDocument: so.customer?.identificationNumber,
          concept: `${so.assetName}${so.assetIdentifier ? ` (${so.assetIdentifier})` : ''}`,
          totalAmount: total,
          paidAmount: paid,
          balanceAmount: balance,
          issueDate: so.createdAt,
          daysOverdue: days,
          agingBucket: this.getAgingBucket(days),
          paymentNotes: so.paymentNotes,
        });
      }
    }

    // Procesar Paquetes de Studio con saldo pendiente
    for (const sub of studioSubs) {
      const planPrice = Number(sub.plan?.price || 0);
      const total = Number(sub.totalAmount || 0) > 0 ? Number(sub.totalAmount) : planPrice;
      const paid =
        Number(sub.totalAmount || 0) === 0 && sub.paymentStatus === 'PAID'
          ? planPrice
          : Number(sub.paidAmount || 0);
      const balance = Math.max(0, total - paid);

      if (balance > 0) {
        const days = this.computeDaysElapsed(sub.createdAt);
        receivables.push({
          id: sub.id,
          sourceType: 'STUDIO_SUBSCRIPTION',
          sourceLabel: 'Paquete Studio (Yoga/Pilates)',
          documentNumber: `STU-${sub.id.slice(-6).toUpperCase()}`,
          customerId: sub.customerId,
          customerName: `${sub.customer?.firstName || ''} ${sub.customer?.lastName || ''}`.trim() || 'Alumno',
          customerPhone: sub.customer?.phoneNumber,
          customerDocument: sub.customer?.identificationNumber,
          concept: sub.plan?.name || 'Paquete Studio',
          totalAmount: total,
          paidAmount: paid,
          balanceAmount: balance,
          issueDate: sub.createdAt,
          daysOverdue: days,
          agingBucket: this.getAgingBucket(days),
          paymentNotes: sub.paymentNotes,
        });
      }
    }

    // Procesar Membresías de Gimnasio con saldo pendiente
    for (const gym of gymSubs) {
      const planPrice = Number(gym.plan?.price || 0);
      const total = Number(gym.totalAmount || 0) > 0 ? Number(gym.totalAmount) : planPrice;
      const paid =
        Number(gym.totalAmount || 0) === 0 && gym.paymentStatus === 'PAID'
          ? planPrice
          : Number(gym.paidAmount || 0);
      const balance = Math.max(0, total - paid);

      if (balance > 0) {
        const days = this.computeDaysElapsed(gym.createdAt);
        receivables.push({
          id: gym.id,
          sourceType: 'GYM_SUBSCRIPTION',
          sourceLabel: 'Membresía Gimnasio',
          documentNumber: `GYM-${gym.id.slice(-6).toUpperCase()}`,
          customerId: gym.customerId,
          customerName: `${gym.customer?.firstName || ''} ${gym.customer?.lastName || ''}`.trim() || 'Socio',
          customerPhone: gym.customer?.phoneNumber,
          customerDocument: gym.customer?.identificationNumber,
          concept: gym.plan?.name || 'Membresía Gym',
          totalAmount: total,
          paidAmount: paid,
          balanceAmount: balance,
          issueDate: gym.createdAt,
          daysOverdue: days,
          agingBucket: this.getAgingBucket(days),
          paymentNotes: gym.paymentNotes,
        });
      }
    }

    // Procesar Cuentas por Pagar (CxP): Facturas de Proveedores + Gastos Operativos Pendientes
    const payables: PayableItem[] = [];

    for (const pi of purchaseInvoices) {
      const total = Number(pi.total || 0);
      if (total <= 0) continue;
      const paid = Number(pi.paidAmount || 0);
      const balance = Math.max(0, total - paid);
      if (balance > 0) {
        const refDate = pi.dueDate || pi.invoiceDate;
        const days = this.computeDaysElapsed(refDate);
        payables.push({
          id: pi.id,
          sourceType: 'PURCHASE_INVOICE',
          sourceLabel: 'Factura de Proveedor',
          documentNumber: pi.invoiceNumber || pi.number,
          beneficiaryName: pi.supplier?.companyName || 'Proveedor',
          beneficiaryPhone: pi.supplier?.phoneNumber,
          concept: pi.notes || `Factura Compra ${pi.invoiceNumber}`,
          totalAmount: total,
          paidAmount: paid,
          balanceAmount: balance,
          issueDate: pi.invoiceDate,
          dueDate: pi.dueDate,
          daysOverdue: days,
          paymentNotes: pi.paymentNotes,
        });
      }
    }

    for (const exp of pendingExpenses) {
      const total = Number(exp.amount || 0);
      if (total <= 0) continue;
      const days = this.computeDaysElapsed(exp.expenseDate);
      payables.push({
        id: exp.id,
        sourceType: 'OPERATING_EXPENSE',
        sourceLabel: `Gasto Operativo (${exp.category})`,
        documentNumber: exp.expenseNumber,
        beneficiaryName: exp.beneficiaryName || 'Beneficiario / Servicios',
        beneficiaryPhone: null,
        concept: exp.description,
        totalAmount: total,
        paidAmount: 0,
        balanceAmount: total,
        issueDate: exp.expenseDate,
        dueDate: exp.expenseDate,
        daysOverdue: days,
        paymentNotes: exp.notes,
      });
    }

    const totalReceivable = receivables.reduce((s, r) => s + r.balanceAmount, 0);
    const currentReceivable = receivables
      .filter((r) => r.agingBucket === 'CURRENT')
      .reduce((s, r) => s + r.balanceAmount, 0);
    const days1To30Receivable = receivables
      .filter((r) => r.agingBucket === 'DAYS_1_30')
      .reduce((s, r) => s + r.balanceAmount, 0);
    const over30Receivable = receivables
      .filter((r) => r.agingBucket === 'DAYS_OVER_30')
      .reduce((s, r) => s + r.balanceAmount, 0);

    const totalPayable = payables.reduce((s, p) => s + p.balanceAmount, 0);

    return {
      summary: {
        totalReceivable,
        receivablesCount: receivables.length,
        currentReceivable,
        days1To30Receivable,
        over30Receivable,
        totalPayable,
        payablesCount: payables.length,
        netPortfolioPosition: totalReceivable - totalPayable,
      },
      receivables: receivables.sort((a, b) => b.daysOverdue - a.daysOverdue),
      payables: payables.sort((a, b) => b.daysOverdue - a.daysOverdue),
    };
  }

  /**
   * Registrar un Abono / Recaudo en cualquier Cuenta por Cobrar (Venta POS, Orden de Servicio, Studio o Gym)
   */
  async recordReceivablePayment(payload: {
    organizationId: string;
    sourceType: 'SALE' | 'SERVICE_ORDER' | 'STUDIO_SUBSCRIPTION' | 'GYM_SUBSCRIPTION';
    sourceId: string;
    amount: number;
    paymentMethod?: string;
    notes?: string;
  }) {
    const amount = Number(payload.amount || 0);
    if (amount <= 0) {
      throw new BadRequestException('El valor del abono debe ser mayor a 0');
    }

    const stamp = new Date().toLocaleDateString('es-CO');
    const logLine = `[${stamp}] Abono +$${amount.toLocaleString('es-CO')} (${payload.paymentMethod || 'TRANSFER'})${payload.notes ? `: ${payload.notes.trim()}` : ''}`;

    if (payload.sourceType === 'SALE') {
      const sale = await this.prisma.sale.findFirst({
        where: { id: payload.sourceId, organizationId: payload.organizationId },
      });
      if (!sale) throw new NotFoundException('Factura de venta no encontrada');

      const methodMap: Record<string, PaymentMethod> = {
        CASH: PaymentMethod.CASH,
        CARD: PaymentMethod.CREDIT_CARD,
        TRANSFER: PaymentMethod.TRANSFER,
        NEQUI: PaymentMethod.TRANSFER,
      };

      await this.prisma.payment.create({
        data: {
          organizationId: payload.organizationId,
          saleId: sale.id,
          method: methodMap[payload.paymentMethod || 'TRANSFER'] || PaymentMethod.TRANSFER,
          amount,
          reference: payload.notes || `ABONO-CXC-${Date.now()}`,
          notes: logLine,
        },
      });

      return { ok: true, sourceType: 'SALE', sourceId: sale.id };
    }

    if (payload.sourceType === 'SERVICE_ORDER') {
      const so = await this.prisma.serviceOrder.findFirst({
        where: { id: payload.sourceId, organizationId: payload.organizationId },
      });
      if (!so) throw new NotFoundException('Orden de servicio no encontrada');

      const total = Number(so.total || 0);
      const newPaid = Math.min(total, Number(so.paidAmount || 0) + amount);
      const newBalance = Math.max(0, total - newPaid);

      if (amount >= 1000 && so.customerId) {
        await this.prisma.customer.update({
          where: { id: so.customerId },
          data: { loyaltyPoints: { increment: Math.floor(amount / 1000) } },
        });
      }

      return this.prisma.serviceOrder.update({
        where: { id: so.id },
        data: {
          paidAmount: newPaid,
          balanceAmount: newBalance,
          paymentStatus: newBalance <= 0 ? 'PAID' : 'PARTIAL',
          paymentNotes: [so.paymentNotes, logLine].filter(Boolean).join(' | '),
        },
      });
    }

    if (payload.sourceType === 'STUDIO_SUBSCRIPTION') {
      const sub = await this.prisma.studioSubscription.findFirst({
        where: { id: payload.sourceId, organizationId: payload.organizationId },
        include: { plan: true },
      });
      if (!sub) throw new NotFoundException('Suscripción de Studio no encontrada');

      const total = Number(sub.totalAmount || 0) > 0 ? Number(sub.totalAmount) : Number(sub.plan?.price || 0);
      const newPaid = Math.min(total, Number(sub.paidAmount || 0) + amount);
      const newBalance = Math.max(0, total - newPaid);

      if (amount >= 1000 && sub.customerId) {
        await this.prisma.customer.update({
          where: { id: sub.customerId },
          data: { loyaltyPoints: { increment: Math.floor(amount / 1000) } },
        });
      }

      return this.prisma.studioSubscription.update({
        where: { id: sub.id },
        data: {
          totalAmount: total,
          paidAmount: newPaid,
          balanceAmount: newBalance,
          paymentStatus: newBalance <= 0 ? 'PAID' : 'PARTIAL',
          paymentNotes: [sub.paymentNotes, logLine].filter(Boolean).join(' | '),
        },
      });
    }

    if (payload.sourceType === 'GYM_SUBSCRIPTION') {
      const gym = await this.prisma.gymSubscription.findFirst({
        where: { id: payload.sourceId, organizationId: payload.organizationId },
        include: { plan: true },
      });
      if (!gym) throw new NotFoundException('Membresía de Gimnasio no encontrada');

      const total = Number(gym.totalAmount || 0) > 0 ? Number(gym.totalAmount) : Number(gym.plan?.price || 0);
      const newPaid = Math.min(total, Number(gym.paidAmount || 0) + amount);
      const newBalance = Math.max(0, total - newPaid);

      if (amount >= 1000 && gym.customerId) {
        await this.prisma.customer.update({
          where: { id: gym.customerId },
          data: { loyaltyPoints: { increment: Math.floor(amount / 1000) } },
        });
      }

      return this.prisma.gymSubscription.update({
        where: { id: gym.id },
        data: {
          totalAmount: total,
          paidAmount: newPaid,
          balanceAmount: newBalance,
          paymentStatus: newBalance <= 0 ? 'PAID' : 'PARTIAL',
          paymentNotes: [gym.paymentNotes, logLine].filter(Boolean).join(' | '),
        },
      });
    }

    throw new BadRequestException('Tipo de cuenta por cobrar no soportado');
  }

  /**
   * Registrar un Pago / Abono en una Cuenta por Pagar (Factura de Proveedor o Gasto Operativo)
   */
  async recordPayablePayment(payload: {
    organizationId: string;
    sourceType: 'PURCHASE_INVOICE' | 'OPERATING_EXPENSE';
    sourceId: string;
    amount: number;
    paymentMethod?: string;
    notes?: string;
  }) {
    const amount = Number(payload.amount || 0);
    if (amount <= 0) {
      throw new BadRequestException('El monto del pago debe ser mayor a 0');
    }

    const stamp = new Date().toLocaleDateString('es-CO');
    const logLine = `[${stamp}] Pago -$${amount.toLocaleString('es-CO')} (${payload.paymentMethod || 'TRANSFER'})${payload.notes ? `: ${payload.notes.trim()}` : ''}`;

    if (payload.sourceType === 'PURCHASE_INVOICE') {
      const inv = await this.prisma.purchaseInvoice.findFirst({
        where: { id: payload.sourceId, organizationId: payload.organizationId },
      });
      if (!inv) throw new NotFoundException('Factura de proveedor no encontrada');

      const total = Number(inv.total || 0);
      const newPaid = Math.min(total, Number(inv.paidAmount || 0) + amount);
      const newBalance = Math.max(0, total - newPaid);

      return this.prisma.purchaseInvoice.update({
        where: { id: inv.id },
        data: {
          paidAmount: newPaid,
          balanceAmount: newBalance,
          status: newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID',
          paymentNotes: [inv.paymentNotes, logLine].filter(Boolean).join(' | '),
        },
      });
    }

    if (payload.sourceType === 'OPERATING_EXPENSE') {
      const exp = await this.prisma.operatingExpense.findFirst({
        where: { id: payload.sourceId, organizationId: payload.organizationId },
      });
      if (!exp) throw new NotFoundException('Gasto operativo no encontrado');

      return this.prisma.operatingExpense.update({
        where: { id: exp.id },
        data: {
          status: 'PAID',
          paymentMethod: payload.paymentMethod || exp.paymentMethod,
          notes: [exp.notes, logLine].filter(Boolean).join(' | '),
        },
      });
    }

    throw new BadRequestException('Tipo de cuenta por pagar no soportado');
  }
}

