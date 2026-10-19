import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { CreateLaundryTicketDto } from './dto/create-laundry-ticket.dto';
import {
  UpdateLaundryConfigDto,
  UpdateLaundryStatusDto,
} from './dto/update-laundry-ticket.dto';
import {
  LaundryPricingMode,
  LaundryTicketStatus,
  ServiceOrderStatus,
} from '@prisma/client';

@Injectable()
export class LaundryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serviceOrdersService: ServiceOrdersService,
  ) {}

  /**
   * Resuelve el ID de organización con soporte a fallback por usuario o tenant activo
   */
  async resolveOrganizationId(
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
   * Resuelve una sucursal válida para la organización si no se envía explícitamente
   */
  async resolveBranchId(
    organizationId: string,
    branchId?: string,
  ): Promise<string> {
    if (branchId) {
      return branchId;
    }

    const mainBranch = await this.prisma.branch.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!mainBranch) {
      throw new BadRequestException(
        'No se encontró una sucursal activa para esta organización.',
      );
    }

    return mainBranch.id;
  }

  /**
   * Dashboard Operativo de Planta de Lavandería & Tintorería
   */
  async getDashboard(
    organizationId?: string,
    branchId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const tickets = await this.prisma.laundryTicket.findMany({
      where: {
        organizationId: orgId,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        customer: true,
        worker: true,
        items: {
          include: { serviceItem: true },
        },
        serviceOrder: {
          include: {
            sale: true,
          },
        },
      },
      orderBy: [{ isExpress: 'desc' }, { createdAt: 'desc' }],
      take: 150,
    });

    const board = {
      RECEIVED: tickets.filter((t) => t.status === LaundryTicketStatus.RECEIVED),
      WASHING: tickets.filter((t) => t.status === LaundryTicketStatus.WASHING),
      DRYING: tickets.filter((t) => t.status === LaundryTicketStatus.DRYING),
      IRONING: tickets.filter((t) => t.status === LaundryTicketStatus.IRONING),
      READY: tickets.filter((t) => t.status === LaundryTicketStatus.READY),
      DELIVERED: tickets
        .filter((t) => t.status === LaundryTicketStatus.DELIVERED)
        .slice(0, 10),
    };

    const activeTickets = tickets.filter(
      (t) =>
        t.status !== LaundryTicketStatus.DELIVERED &&
        t.status !== LaundryTicketStatus.CANCELLED,
    );

    const totalWeightInPlantKg = activeTickets.reduce(
      (acc, t) => acc + Number(t.totalWeightKg || 0),
      0,
    );

    const totalPiecesInPlant = activeTickets.reduce(
      (acc, t) => acc + Number(t.totalPieces || 0),
      0,
    );

    const pendingRevenueInPlant = activeTickets.reduce(
      (acc, t) => acc + Number(t.total || 0),
      0,
    );

    const expressTicketsCount = activeTickets.filter((t) => t.isExpress).length;

    return {
      kpis: {
        activeTicketsCount: activeTickets.length,
        readyForPickupCount: board.READY.length,
        totalWeightInPlantKg: Number(totalWeightInPlantKg.toFixed(2)),
        totalPiecesInPlant,
        expressTicketsCount,
        pendingRevenueInPlant,
      },
      board,
      recentTickets: tickets.slice(0, 20),
    };
  }

  /**
   * Listado y búsqueda de tickets de lavandería
   */
  async findAllTickets(
    organizationId?: string,
    branchId?: string,
    status?: LaundryTicketStatus,
    search?: string,
    customerId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    return this.prisma.laundryTicket.findMany({
      where: {
        organizationId: orgId,
        ...(branchId ? { branchId } : {}),
        ...(status ? { status } : {}),
        ...(customerId ? { customerId } : {}),
        ...(search
          ? {
              OR: [
                { ticketNumber: { contains: search, mode: 'insensitive' } },
                { rackLocation: { contains: search, mode: 'insensitive' } },
                {
                  customer: {
                    firstName: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  customer: {
                    lastName: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  customer: {
                    companyName: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  customer: {
                    identificationNumber: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        customer: true,
        worker: true,
        items: {
          include: { serviceItem: true },
        },
        serviceOrder: {
          include: {
            sale: true,
            materials: { include: { product: true } },
          },
        },
      },
      orderBy: [{ isExpress: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  /**
   * Detalle de un ticket de lavandería
   */
  async findTicketById(id: string, organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const ticket = await this.prisma.laundryTicket.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        worker: true,
        branch: true,
        items: {
          include: { serviceItem: true },
        },
        serviceOrder: {
          include: {
            tasks: true,
            materials: { include: { product: true } },
            sale: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket de lavandería ${id} no encontrado.`);
    }

    return ticket;
  }

  /**
   * Crear nuevo Ticket de Recepción de Prendas + Orden de Servicio vinculada
   */
  async createTicket(dto: CreateLaundryTicketDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);
    const branchId = await this.resolveBranchId(orgId, dto.branchId);

    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, organizationId: orgId },
    });

    if (!customer) {
      throw new NotFoundException('El cliente seleccionado no existe.');
    }

    const config = await this.getConfig(orgId, userId);
    const defaultPricePerKg = Number(
      config.settings?.defaultPricePerKg ?? 6000,
    );
    const expressPct = Number(config.settings?.expressSurchargePct ?? 30);
    const defaultPromisedHours = Number(
      config.settings?.defaultPromisedHours ?? 24,
    );

    const weightKg = Number(dto.totalWeightKg || 0);
    const pricePerKg =
      dto.pricePerKg !== undefined ? Number(dto.pricePerKg) : defaultPricePerKg;

    const itemInputs = dto.items || [];
    let itemsSubtotal = 0;
    let totalPieces = 0;

    const preparedItems = itemInputs.map((it) => {
      const qty = Number(it.quantity || 1);
      const uPrice = Number(it.unitPrice || 0);
      const lineSub = qty * uPrice;
      itemsSubtotal += lineSub;
      totalPieces += qty;

      return {
        serviceItemId: it.serviceItemId || null,
        garmentType: it.garmentType.trim(),
        processType: it.processType || 'WASH_AND_FOLD',
        color: it.color?.trim() || null,
        brand: it.brand?.trim() || null,
        defectsNotes: it.defectsNotes?.trim() || null,
        quantity: qty,
        weightKg: it.weightKg !== undefined ? it.weightKg : null,
        unitPrice: uPrice,
        subtotal: lineSub,
      };
    });

    // Si hay cobro por peso base además o en lugar de las prendas individuales
    const weightCharge =
      dto.pricingMode === LaundryPricingMode.BY_WEIGHT ||
      dto.pricingMode === LaundryPricingMode.MIXED
        ? weightKg * pricePerKg
        : 0;

    const subtotal = weightCharge + itemsSubtotal;
    const isExpress = !!dto.isExpress;
    const expressSurcharge = isExpress
      ? Math.round(subtotal * (expressPct / 100))
      : 0;
    const grandTotal = subtotal + expressSurcharge;

    if (totalPieces === 0 && weightKg > 0) {
      totalPieces = 1;
    }

    const promisedAt = dto.promisedAt
      ? new Date(dto.promisedAt)
      : new Date(
          Date.now() +
            (isExpress ? Math.max(4, Math.floor(defaultPromisedHours / 3)) : defaultPromisedHours) *
              3600 *
              1000,
        );

    const ticketNumber = `LAV-${Date.now().toString().slice(-6)}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Preparar materiales / insumos de lavado si se enviaron (detergente, bolsas, ganchos)
      let materialsTotal = 0;
      const materialCreates: Array<{
        productId: string;
        quantity: number;
        unitCost: number;
        unitPrice: number;
        total: number;
      }> = [];

      if (dto.materials && dto.materials.length > 0) {
        for (const mat of dto.materials) {
          const prod = await tx.product.findFirst({
            where: { id: mat.productId, organizationId: orgId },
          });
          if (!prod) {
            throw new NotFoundException(
              `Insumo de lavandería ${mat.productId} no encontrado.`,
            );
          }
          const qty = Number(mat.quantity);
          const uPrice =
            mat.unitPrice !== undefined ? Number(mat.unitPrice) : 0; // Por defecto 0 si es costo interno incluido en tarifa
          const uCost = Number(prod.costPrice || 0);
          const lineTotal = qty * uPrice;
          materialsTotal += lineTotal;

          materialCreates.push({
            productId: prod.id,
            quantity: qty,
            unitCost: uCost,
            unitPrice: uPrice,
            total: lineTotal,
          });
        }
      }

      // 2. Crear la ServiceOrder vinculada para trazabilidad, comisiones y cobro en POS
      const taskCreates: Array<{
        serviceItemId: string | null;
        description: string;
        price: number;
        assignedWorkerId: string | null;
      }> = [];

      if (weightCharge > 0) {
        taskCreates.push({
          serviceItemId: null,
          description: `Lavado por peso (${weightKg} kg x $${pricePerKg})`,
          price: weightCharge,
          assignedWorkerId: dto.workerId || null,
        });
      }

      for (const item of preparedItems) {
        if (item.subtotal > 0) {
          taskCreates.push({
            serviceItemId: item.serviceItemId,
            description: `${item.quantity}x ${item.garmentType} (${item.processType})`,
            price: item.subtotal,
            assignedWorkerId: dto.workerId || null,
          });
        }
      }

      if (expressSurcharge > 0) {
        taskCreates.push({
          serviceItemId: null,
          description: `Recargo Servicio Express (${expressPct}%)`,
          price: expressSurcharge,
          assignedWorkerId: dto.workerId || null,
        });
      }

      const serviceOrder = await tx.serviceOrder.create({
        data: {
          organizationId: orgId,
          branchId,
          customerId: customer.id,
          assignedWorkerId: dto.workerId || null,
          orderNumber: ticketNumber,
          assetName: `Lote de Prendas (${totalPieces} pzas${weightKg ? ` / ${weightKg} kg` : ''})`,
          assetIdentifier: dto.rackLocation || ticketNumber,
          initialNotes: dto.notes || 'Recepción de lavandería',
          scheduledAt: promisedAt,
          status: ServiceOrderStatus.PENDING,
          laborTotal: grandTotal,
          materialsTotal,
          total: grandTotal + materialsTotal,
          ...(taskCreates.length > 0
            ? {
                tasks: {
                  create: taskCreates,
                },
              }
            : {}),
          ...(materialCreates.length > 0
            ? {
                materials: {
                  create: materialCreates,
                },
              }
            : {}),
        },
      });

      // 3. Crear el LaundryTicket con sus LaundryTicketItems
      return tx.laundryTicket.create({
        data: {
          organizationId: orgId,
          branchId,
          customerId: customer.id,
          workerId: dto.workerId || null,
          serviceOrderId: serviceOrder.id,
          ticketNumber,
          status: LaundryTicketStatus.RECEIVED,
          pricingMode: dto.pricingMode || LaundryPricingMode.MIXED,
          totalWeightKg: weightKg > 0 ? weightKg : null,
          pricePerKg: weightKg > 0 ? pricePerKg : null,
          totalPieces,
          rackLocation: dto.rackLocation?.trim() || null,
          isExpress,
          promisedAt,
          subtotal,
          expressSurcharge,
          total: grandTotal + materialsTotal,
          notes: dto.notes?.trim() || null,
          ...(preparedItems.length > 0
            ? {
                items: {
                  create: preparedItems,
                },
              }
            : {}),
        },
        include: {
          customer: true,
          worker: true,
          items: { include: { serviceItem: true } },
          serviceOrder: true,
        },
      });
    });
  }

  /**
   * Avanzar o cambiar estado del ticket en la planta (RECEIVED -> WASHING -> DRYING -> IRONING -> READY -> DELIVERED)
   * Sincroniza la ServiceOrder vinculada y descuenta insumos una única vez al pasar a READY / DELIVERED
   */
  async updateTicketStatus(
    id: string,
    dto: UpdateLaundryStatusDto,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const ticket = await this.prisma.laundryTicket.findFirst({
      where: { id, organizationId: orgId },
      include: { serviceOrder: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket de lavandería ${id} no encontrado.`);
    }

    // Sincronizar con el motor de ServiceOrder
    if (ticket.serviceOrderId && ticket.serviceOrder) {
      const currentOrderStatus = ticket.serviceOrder.status;

      if (
        (dto.status === LaundryTicketStatus.WASHING ||
          dto.status === LaundryTicketStatus.DRYING ||
          dto.status === LaundryTicketStatus.IRONING) &&
        currentOrderStatus === ServiceOrderStatus.PENDING
      ) {
        await this.prisma.serviceOrder.update({
          where: { id: ticket.serviceOrderId },
          data: { status: ServiceOrderStatus.IN_PROGRESS },
        });
      } else if (
        (dto.status === LaundryTicketStatus.READY ||
          dto.status === LaundryTicketStatus.DELIVERED) &&
        currentOrderStatus !== ServiceOrderStatus.COMPLETED &&
        currentOrderStatus !== ServiceOrderStatus.BILLED
      ) {
        await this.serviceOrdersService.updateStatus(
          ticket.serviceOrderId,
          orgId,
          ServiceOrderStatus.COMPLETED,
          userId,
        );
      } else if (
        dto.status === LaundryTicketStatus.CANCELLED &&
        currentOrderStatus === ServiceOrderStatus.PENDING
      ) {
        await this.prisma.serviceOrder.update({
          where: { id: ticket.serviceOrderId },
          data: { status: ServiceOrderStatus.CANCELLED },
        });
      }
    }

    return this.prisma.laundryTicket.update({
      where: { id: ticket.id },
      data: {
        status: dto.status,
        ...(dto.rackLocation !== undefined && {
          rackLocation: dto.rackLocation.trim() || null,
        }),
        ...(dto.workerId !== undefined && {
          workerId: dto.workerId || null,
        }),
        ...(dto.notes !== undefined && {
          notes: dto.notes.trim() || ticket.notes,
        }),
        ...(dto.status === LaundryTicketStatus.DELIVERED && {
          deliveredAt: new Date(),
        }),
      },
      include: {
        customer: true,
        worker: true,
        items: { include: { serviceItem: true } },
        serviceOrder: {
          include: { sale: true },
        },
      },
    });
  }

  /**
   * Configuración del vertical LAUNDRY para el tenant
   */
  async getConfig(organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'LAUNDRY' },
    });

    if (!vertical) {
      throw new NotFoundException(
        'El vertical LAUNDRY no está registrado en el catálogo maestro.',
      );
    }

    const orgVertical = await this.prisma.organizationVertical.findUnique({
      where: {
        organizationId_verticalId: {
          organizationId: orgId,
          verticalId: vertical.id,
        },
      },
    });

    const defaultSettings = {
      defaultPricePerKg: 6000,
      expressSurchargePct: 30,
      defaultPromisedHours: 24,
      autoCreateServiceOrder: true,
    };

    return {
      organizationId: orgId,
      verticalCode: 'LAUNDRY',
      isActive: orgVertical?.isActive ?? false,
      settings: {
        ...defaultSettings,
        ...((orgVertical?.config as Record<string, any>) || {}),
      },
    };
  }

  /**
   * Actualizar configuración del vertical LAUNDRY
   */
  async updateConfig(dto: UpdateLaundryConfigDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'LAUNDRY' },
    });

    if (!vertical) {
      throw new NotFoundException(
        'El vertical LAUNDRY no está registrado en el catálogo maestro.',
      );
    }

    const current = await this.getConfig(orgId, userId);
    const { organizationId: _ignored, ...newSettings } = dto;
    const mergedSettings = {
      ...current.settings,
      ...newSettings,
    };

    const updated = await this.prisma.organizationVertical.upsert({
      where: {
        organizationId_verticalId: {
          organizationId: orgId,
          verticalId: vertical.id,
        },
      },
      update: {
        config: mergedSettings,
      },
      create: {
        organizationId: orgId,
        verticalId: vertical.id,
        isActive: true,
        config: mergedSettings,
      },
    });

    return {
      organizationId: orgId,
      verticalCode: 'LAUNDRY',
      isActive: updated.isActive,
      settings: updated.config,
    };
  }
}

