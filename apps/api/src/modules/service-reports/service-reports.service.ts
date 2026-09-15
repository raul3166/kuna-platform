import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class ServiceReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reporte General de Ingresos por Servicios
   */
  async getRevenueReport(
    organizationId: string,
    branchId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { organizationId };

    if (branchId) where.branchId = branchId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const orders = await this.prisma.serviceOrder.findMany({
      where,
      include: {
        customer: true,
        assignedWorker: true,
        serviceItem: true,
        materials: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = orders.reduce((acc, order) => acc + Number(order.total || 0), 0);
    const totalLabor = orders.reduce((acc, order) => acc + Number(order.laborTotal || 0), 0);
    const totalMaterials = orders.reduce((acc, order) => acc + Number(order.materialsTotal || 0), 0);

    return {
      totalOrders: orders.length,
      totalRevenue,
      totalLabor,
      totalMaterials,
      ordersByStatus: orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      data: orders,
    };
  }

  /**
   * Reporte de Liquidación de Comisiones por Técnico/Trabajador
   * Calcula comisiones usando `laborTotal` de la orden y `commissionPercentage` del trabajador
   */
  async getCommissionsReport(
    organizationId: string,
    branchId?: string,
    startDate?: string,
    endDate?: string,
    workerId?: string,
  ) {
    const orderWhere: any = {
      organizationId,
      // Solo tomamos órdenes completadas o facturadas para comisionar
      status: { in: ['COMPLETED', 'BILLED'] },
    };

    if (branchId) orderWhere.branchId = branchId;
    if (startDate || endDate) {
      orderWhere.createdAt = {};
      if (startDate) orderWhere.createdAt.gte = new Date(startDate);
      if (endDate) orderWhere.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    const workerWhere: any = { organizationId, isActive: true };
    if (branchId) workerWhere.branchId = branchId;
    if (workerId) workerWhere.id = workerId;

    const workers = await this.prisma.serviceWorker.findMany({
      where: workerWhere,
      include: {
        assignedOrders: {
          where: orderWhere,
          include: {
            customer: true,
            serviceItem: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return workers.map((worker) => {
      const commissionPercentage = Number(worker.commissionPercentage || 0);

      const ordersDetail = worker.assignedOrders.map((order) => {
        const laborTotal = Number(order.laborTotal || 0);
        const commissionAmount = (laborTotal * commissionPercentage) / 100;

        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer
            ? `${order.customer.firstName} ${order.customer.lastName || ''}`.trim()
            : 'Cliente no registrado',
          serviceName: order.serviceItem?.name || order.assetName,
          status: order.status,
          createdAt: order.createdAt,
          laborTotal,
          commissionPercentage,
          commissionAmount,
        };
      });

      const totalLaborGenerated = ordersDetail.reduce((sum, item) => sum + item.laborTotal, 0);
      const totalCommissionEarned = ordersDetail.reduce((sum, item) => sum + item.commissionAmount, 0);

      return {
        workerId: worker.id,
        workerName: `${worker.firstName} ${worker.lastName || ''}`.trim(),
        identification: worker.identification,
        employmentType: worker.employmentType,
        commissionPercentage,
        fixedSalary: Number(worker.fixedSalary || 0),
        totalOrders: ordersDetail.length,
        totalLaborGenerated,
        totalCommissionEarned,
        orders: ordersDetail,
      };
    });
  }

  /**
   * Reporte de Consumo de Materiales en Servicios
   */
  async getMaterialConsumptionReport(
    organizationId: string,
    branchId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = {
      organizationId,
      movementType: 'SERVICE_CONSUMPTION',
    };

    if (branchId) where.branchId = branchId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59.999Z`);
    }

    return this.prisma.inventoryMovement.findMany({
      where,
      include: { product: true, branch: true, serviceOrder: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
