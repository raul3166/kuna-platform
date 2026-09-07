import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { DashboardKpiQueryDto } from './dto/create-analytics.dto';
import { SalesPerformanceQueryDto } from './dto/sales-performance-query.dto';
import { TopSellersQueryDto } from './dto/top-sellers-query.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardKPIs(query: DashboardKpiQueryDto) {
    const { organizationId, branchId, startDate, endDate } = query;

    const saleWhere: any = {
      organizationId,
      status: 'CONFIRMED',
    };

    if (branchId) {
      saleWhere.branchId = branchId;
    }

    if (startDate || endDate) {
      saleWhere.createdAt = {};
      if (startDate) saleWhere.createdAt.gte = new Date(startDate);
      if (endDate) saleWhere.createdAt.lte = new Date(endDate);
    }

    const salesAggregate = await this.prisma.sale.aggregate({
      where: saleWhere,
      _sum: {
        total: true,
        subtotal: true,
        discount: true,
        tax: true,
      },
      _count: {
        id: true,
      },
    });

    const totalSales = Number(salesAggregate._sum.total || 0);
    const totalTransactions = salesAggregate._count.id || 0;
    const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        sale: saleWhere,
      },
      select: {
        quantity: true,
        product: {
          select: {
            costPrice: true,
          },
        },
      },
    });

    let totalCost = 0;
    saleItems.forEach((item) => {
      const itemCost = Number(item.product?.costPrice || 0) * item.quantity;
      totalCost += itemCost;
    });

    const grossProfit = totalSales - totalCost;
    const marginPercentage = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    const paymentsGrouped = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        organizationId,
        sale: saleWhere,
      },
      _sum: {
        amount: true,
      },
    });

    const paymentBreakdown = paymentsGrouped.map((pg) => ({
      method: pg.method,
      total: Number(pg._sum.amount || 0),
    }));

    const returnWhere: any = { organizationId, status: 'COMPLETED' };
    if (branchId) returnWhere.branchId = branchId;
    if (startDate || endDate) {
      returnWhere.createdAt = {};
      if (startDate) returnWhere.createdAt.gte = new Date(startDate);
      if (endDate) returnWhere.createdAt.lte = new Date(endDate);
    }

    const returnsAggregate = await this.prisma.saleReturn.aggregate({
      where: returnWhere,
      _sum: { total: true },
      _count: { id: true },
    });

    const totalReturns = Number(returnsAggregate._sum.total || 0);

    return {
      kpis: {
        totalRevenue: totalSales,
        netRevenue: totalSales - totalReturns,
        totalTransactions,
        averageTicket: Number(averageTicket.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        grossProfit: Number(grossProfit.toFixed(2)),
        grossMarginPercentage: Number(marginPercentage.toFixed(2)),
        totalReturnsAmount: totalReturns,
        totalReturnsCount: returnsAggregate._count.id || 0,
      },
      paymentBreakdown,
    };
  }

 async getSalesPerformanceReport(query: SalesPerformanceQueryDto) {
  const { organizationId, branchId, startDate, endDate } = query;

  // 1. Filtro base para las ventas
  const saleWhereCondition: any = {
    organizationId,
    status: 'CONFIRMED',
  };

  if (branchId) {
    saleWhereCondition.branchId = branchId;
  }

  if (startDate || endDate) {
    saleWhereCondition.createdAt = {};
    if (startDate) saleWhereCondition.createdAt.gte = new Date(startDate);
    if (endDate) saleWhereCondition.createdAt.lte = new Date(endDate);
  }

  // 2. Agregado por Sucursal
  // 1. Agregado por Sucursal
const salesByBranchRaw = await this.prisma.sale.groupBy({
  by: ['branchId'],
  where: saleWhereCondition,
  _sum: {
    subtotal: true,
    discount: true,
    tax: true,
    total: true,
  },
  _count: {
    id: true,
  },
});

const branchIds = salesByBranchRaw.map((b) => b.branchId);
const branches = await this.prisma.branch.findMany({
  where: { id: { in: branchIds } },
  select: { id: true, name: true, code: true },
});

const branchMap = new Map(branches.map((b) => [b.id, b]));

const byBranch = salesByBranchRaw.map((item) => {
  const branchInfo = branchMap.get(item.branchId);
  return {
    branchId: item.branchId,
    branchName: branchInfo?.name || 'Desconocida',
    branchCode: branchInfo?.code || 'N/A',
    subtotal: Number(item._sum?.subtotal || 0),
    discount: Number(item._sum?.discount || 0),
    tax: Number(item._sum?.tax || 0),
    totalSales: Number(item._sum?.total || 0),
    transactionCount: item._count?.id || 0,
  };
});

  // 3. Agregado por Estado / Canal de Venta
  const salesByStatusRaw = await this.prisma.sale.groupBy({
    by: ['status'],
    where: saleWhereCondition,
    _sum: {
      total: true,
    },
    _count: {
      id: true,
    },
  });

  const byChannel = salesByStatusRaw.map((item) => ({
    channel: 'POS',
    totalSales: Number(item._sum?.total || 0),
    transactionCount: item._count?.id || 0,
  }));

  // 4. Agregado por Medio de Pago (CORREGIDO PARA EVITAR ERROR 500)
  // Obtenemos las IDs de las ventas filtradas para no romper el groupBy de Prisma
  const matchingSales = await this.prisma.sale.findMany({
    where: saleWhereCondition,
    select: { id: true },
  });

  const saleIds = matchingSales.map((s) => s.id);

  let byPaymentMethod: Array<{ paymentMethod: string; totalAmount: number; count: number }> = [];

  if (saleIds.length > 0) {
    const salesByPaymentRaw = await this.prisma.payment.groupBy({
      by: ['method'],
      where: {
        organizationId,
        saleId: { in: saleIds }, // Filtro directo por ID en lugar de relación anidada
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    byPaymentMethod = salesByPaymentRaw.map((item) => ({
      paymentMethod: item.method,
      totalAmount: Number(item._sum?.amount || 0),
      count: item._count?.id || 0,
    }));
  }

  return {
    byBranch,
    byChannel,
    byPaymentMethod,
  };
}


// ... dentro de la clase AnalyticsService

async getTopSellers(query: TopSellersQueryDto) {
  const { organizationId, branchId, startDate, endDate, limit = 10 } = query;

  const saleWhere: any = {
    organizationId,
    status: 'CONFIRMED',
  };

  if (branchId) saleWhere.branchId = branchId;

  if (startDate || endDate) {
    saleWhere.createdAt = {};
    if (startDate) saleWhere.createdAt.gte = new Date(startDate);
    if (endDate) saleWhere.createdAt.lte = new Date(endDate);
  }

  // 1. Obtenemos las IDs de las ventas que cumplen el filtro
  const matchingSales = await this.prisma.sale.findMany({
    where: saleWhere,
    select: { id: true },
  });

  const saleIds = matchingSales.map((s) => s.id);

  if (saleIds.length === 0) {
    return [];
  }

  // 2. Agrupamos los ítems directamente por saleId (evita el JOIN en groupBy de Prisma)
  const topItemsRaw = await this.prisma.saleItem.groupBy({
    by: ['productId'],
    where: {
      saleId: { in: saleIds },
    },
    _sum: {
      quantity: true,
      subtotal: true,
    },
    _count: {
      id: true,
    },
  });

  // 3. Ordenamos en memoria por cantidad vendida y aplicamos el límite
  const sortedItems = topItemsRaw
    .sort((a, b) => Number(b._sum?.quantity || 0) - Number(a._sum?.quantity || 0))
    .slice(0, Number(limit));

  // 4. Mapeamos la información de los productos
  const productIds = sortedItems.map((item) => item.productId);

  const products = await this.prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  return sortedItems.map((item) => {
    const prod = productMap.get(item.productId);
    return {
      productId: item.productId,
      productName: prod?.name || 'Producto eliminado',
      sku: prod?.sku || 'N/A',
      totalQuantity: Number(item._sum?.quantity || 0),
      totalRevenue: Number(item._sum?.subtotal || 0),
      transactionCount: item._count?.id || 0,
    };
  });
}

async getInventoryTurnover(query: TopSellersQueryDto) {
  const { organizationId, branchId, startDate, endDate } = query;

  // 1. Ventas e ítems vendidos en el período (COGS)
  const saleWhere: any = { organizationId, status: 'CONFIRMED' };
  if (branchId) saleWhere.branchId = branchId;
  if (startDate || endDate) {
    saleWhere.createdAt = {};
    if (startDate) saleWhere.createdAt.gte = new Date(startDate);
    if (endDate) saleWhere.createdAt.lte = new Date(endDate);
  }

  const soldItems = await this.prisma.saleItem.findMany({
    where: { sale: saleWhere },
    select: {
      quantity: true,
      product: { select: { costPrice: true } },
    },
  });

  let totalCogs = 0;
  let totalUnitsSold = 0;
  soldItems.forEach((item) => {
    const qty = Number(item.quantity || 0);
    totalUnitsSold += qty;
    totalCogs += qty * Number(item.product?.costPrice || 0);
  });

  // 2. Consulta de Inventario
  let totalStockUnits = 0;
  let totalInventoryValue = 0;

  if (branchId) {
    // Filtrado por sucursal específica usando BranchProductStock
    const branchStocks = await this.prisma.branchProductStock.findMany({
      where: {
        branchId,
        product: { organizationId },
      },
      select: {
        stock: true,
        averageCost: true,
        product: { select: { costPrice: true } },
      },
    });

    branchStocks.forEach((bs) => {
      const stockQty = Number(bs.stock || 0);
      const unitCost = Number(bs.averageCost) > 0 ? Number(bs.averageCost) : Number(bs.product?.costPrice || 0);
      totalStockUnits += stockQty;
      totalInventoryValue += stockQty * unitCost;
    });
  } else {
    // Consolidado de la organización desde Product
    const products = await this.prisma.product.findMany({
      where: { organizationId, isActive: true },
      select: {
        stock: true,
        costPrice: true,
      },
    });

    products.forEach((prod) => {
      const stockQty = Number(prod.stock || 0);
      const unitCost = Number(prod.costPrice || 0);
      totalStockUnits += stockQty;
      totalInventoryValue += stockQty * unitCost;
    });
  }

  // Cálculo del Turnover Ratio (Rotación de Inventario)
  const turnoverRatio = totalInventoryValue > 0 ? totalCogs / totalInventoryValue : 0;

  return {
    totalUnitsSold,
    totalCogs: Number(totalCogs.toFixed(2)),
    totalStockUnits,
    totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
    turnoverRatio: Number(turnoverRatio.toFixed(2)),
  };
}
// ============================================================
// REPORTE FISCAL DE IMPUESTOS Y CIERRE DE CAJA (ARQUEO Z)
// ============================================================
async getFiscalSummaryReport(query: SalesPerformanceQueryDto) {
  const { organizationId, branchId, startDate, endDate } = query;

  const saleWhereCondition: any = {
    organizationId,
    status: 'CONFIRMED',
  };

  if (branchId) {
    saleWhereCondition.branchId = branchId;
  }

  if (startDate || endDate) {
    saleWhereCondition.createdAt = {};
    if (startDate) saleWhereCondition.createdAt.gte = new Date(startDate);
    if (endDate) saleWhereCondition.createdAt.lte = new Date(endDate);
  }

  // 1. IDs de ventas filtradas
  const matchingSales = await this.prisma.sale.findMany({
    where: saleWhereCondition,
    select: {
      id: true,
      subtotal: true,
      tax: true,
      discount: true,
      total: true,
    },
  });

  const saleIds = matchingSales.map((s) => s.id);

  if (saleIds.length === 0) {
    return {
      summary: {
        totalTransactions: 0,
        totalBase: 0,
        totalTax: 0,
        totalDiscount: 0,
        grandTotal: 0,
      },
      taxBreakdown: [],
      paymentBreakdown: [],
    };
  }

  // 2. Desglose de impuestos por tarifa (0%, 5%, 19%, etc.)
  const saleItems = await this.prisma.saleItem.findMany({
    where: { saleId: { in: saleIds } },
    select: {
      subtotal: true,
      taxAmount: true,
      total: true,
      taxPercentage: true,
    },
  });

  const taxMap = new Map<
    number,
    { taxRate: number; baseAmount: number; taxAmount: number; totalAmount: number }
  >();

  saleItems.forEach((item) => {
    const rate = Number(item.taxPercentage || 0);
    const existing = taxMap.get(rate) || {
      taxRate: rate,
      baseAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
    };

    existing.baseAmount += Number(item.subtotal || 0);
    existing.taxAmount += Number(item.taxAmount || 0);
    existing.totalAmount += Number(item.total || 0);

    taxMap.set(rate, existing);
  });

  const taxBreakdown = Array.from(taxMap.values()).map((t) => ({
    taxRate: t.taxRate,
    baseAmount: Number(t.baseAmount.toFixed(2)),
    taxAmount: Number(t.taxAmount.toFixed(2)),
    totalAmount: Number(t.totalAmount.toFixed(2)),
  }));

  // 3. Arqueo por Medio de Pago
  const paymentsGrouped = await this.prisma.payment.groupBy({
    by: ['method'],
    where: {
      organizationId,
      saleId: { in: saleIds },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const paymentBreakdown = paymentsGrouped.map((pg) => ({
    paymentMethod: pg.method,
    totalAmount: Number(pg._sum.amount || 0),
    transactionCount: pg._count.id || 0,
  }));

  // 4. Totales Consolidados
  const totalBase = matchingSales.reduce((acc, s) => acc + Number(s.subtotal || 0), 0);
  const totalTax = matchingSales.reduce((acc, s) => acc + Number(s.tax || 0), 0);
  const totalDiscount = matchingSales.reduce((acc, s) => acc + Number(s.discount || 0), 0);
  const grandTotal = matchingSales.reduce((acc, s) => acc + Number(s.total || 0), 0);

  return {
    summary: {
      totalTransactions: matchingSales.length,
      totalBase: Number(totalBase.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      grandTotal: Number(grandTotal.toFixed(2)),
    },
    taxBreakdown,
    paymentBreakdown,
  };
}
}
