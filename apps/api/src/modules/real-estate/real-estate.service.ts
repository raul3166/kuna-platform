import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  CreateRealEstateLeaseDto,
  CreateRealEstatePropertyDto,
  GenerateRentChargeDto,
  UpdateRealEstateConfigDto,
  UpdateRealEstatePropertyStatusDto,
} from './dto/real-estate.dto';
import {
  Prisma,
  RealEstateLeaseStatus,
  RealEstatePropertyStatus,
  RealEstatePropertyType,
  ServiceOrderStatus,
} from '@prisma/client';

@Injectable()
export class RealEstateService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveOrganizationId(
    organizationId?: string,
    userId?: string,
  ): Promise<string> {
    if (organizationId && organizationId.trim() !== '') {
      return organizationId;
    }

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (user?.organizationId) {
        return user.organizationId;
      }
    }

    const fallbackOrg = await this.prisma.organization.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!fallbackOrg) {
      throw new BadRequestException(
        'No se encontró una organización activa para operar el módulo de Inmobiliaria.',
      );
    }

    return fallbackOrg.id;
  }

  private async resolveBranchId(
    organizationId: string,
    branchId?: string,
  ): Promise<string> {
    if (branchId && branchId.trim() !== '') {
      return branchId;
    }

    const branch = await this.prisma.branch.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!branch) {
      throw new BadRequestException(
        'No se encontró una sucursal activa para registrar las operaciones inmobiliarias.',
      );
    }

    return branch.id;
  }

  async getDashboard(
    organizationId?: string,
    branchId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);
    const branchFilter = branchId ? { branchId } : {};

    const [properties, activeLeases, recentRentCharges] = await Promise.all([
      this.prisma.realEstateProperty.findMany({
        where: {
          organizationId: orgId,
          ...branchFilter,
          isActive: true,
        },
        include: {
          ownerCustomer: true,
          agentWorker: true,
          branch: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.realEstateLease.findMany({
        where: {
          organizationId: orgId,
          ...branchFilter,
          status: RealEstateLeaseStatus.ACTIVE,
        },
        include: {
          property: true,
          tenantCustomer: true,
          agentWorker: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.realEstateRentCharge.findMany({
        where: {
          organizationId: orgId,
          ...branchFilter,
        },
        include: {
          lease: {
            include: {
              property: {
                include: { ownerCustomer: true },
              },
              tenantCustomer: true,
            },
          },
          serviceOrder: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
    ]);

    const totalPropertiesCount = properties.length;
    const rentedPropertiesCount = properties.filter(
      (p) => p.status === RealEstatePropertyStatus.RENTED,
    ).length;
    const availablePropertiesCount = properties.filter(
      (p) => p.status === RealEstatePropertyStatus.AVAILABLE,
    ).length;

    const occupancyRatePct =
      totalPropertiesCount > 0
        ? Math.round((rentedPropertiesCount / totalPropertiesCount) * 100)
        : 0;

    const monthlyRentPortfolio = activeLeases.reduce(
      (sum, l) => sum + Number(l.monthlyRent ?? 0) + Number(l.adminFee ?? 0),
      0,
    );

    const monthlyAgencyCommission = activeLeases.reduce(
      (sum, l) =>
        sum +
        (Number(l.monthlyRent ?? 0) * Number(l.agencyCommissionPct ?? 10)) /
          100,
      0,
    );

    const pendingRentChargesCount = recentRentCharges.filter(
      (c) => c.serviceOrder && !c.serviceOrder.saleId,
    ).length;

    const propertiesByStatus = {
      AVAILABLE: properties.filter(
        (p) => p.status === RealEstatePropertyStatus.AVAILABLE,
      ),
      RENTED: properties.filter(
        (p) => p.status === RealEstatePropertyStatus.RENTED,
      ),
      MAINTENANCE: properties.filter(
        (p) => p.status === RealEstatePropertyStatus.MAINTENANCE,
      ),
      RESERVED: properties.filter(
        (p) => p.status === RealEstatePropertyStatus.RESERVED,
      ),
    };

    return {
      kpis: {
        totalPropertiesCount,
        rentedPropertiesCount,
        availablePropertiesCount,
        occupancyRatePct,
        activeLeasesCount: activeLeases.length,
        monthlyRentPortfolio,
        monthlyAgencyCommission,
        pendingRentChargesCount,
      },
      propertiesByStatus,
      recentRentCharges,
    };
  }

  async findAllProperties(
    organizationId?: string,
    branchId?: string,
    status?: string,
    search?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const where: Prisma.RealEstatePropertyWhereInput = {
      organizationId: orgId,
      isActive: true,
      ...(branchId ? { branchId } : {}),
      ...(status ? { status: status as RealEstatePropertyStatus } : {}),
    };

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { neighborhood: { contains: q, mode: 'insensitive' } },
      ];
    }

    return this.prisma.realEstateProperty.findMany({
      where,
      include: {
        ownerCustomer: true,
        agentWorker: true,
        branch: true,
        leases: {
          where: { status: RealEstateLeaseStatus.ACTIVE },
          include: { tenantCustomer: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProperty(dto: CreateRealEstatePropertyDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);
    const branchId = await this.resolveBranchId(orgId, dto.branchId);

    const owner = await this.prisma.customer.findFirst({
      where: { id: dto.ownerCustomerId, organizationId: orgId },
    });

    if (!owner) {
      throw new NotFoundException(
        'El propietario seleccionado no existe en el directorio de clientes.',
      );
    }

    const code =
      dto.code?.trim() ||
      `INM-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.realEstateProperty.create({
      data: {
        organizationId: orgId,
        branchId,
        ownerCustomerId: owner.id,
        agentWorkerId: dto.agentWorkerId || null,
        code,
        title: dto.title.trim(),
        propertyType: dto.propertyType || RealEstatePropertyType.APARTMENT,
        status: RealEstatePropertyStatus.AVAILABLE,
        address: dto.address.trim(),
        city: dto.city || 'Medellín',
        neighborhood: dto.neighborhood,
        areaM2: dto.areaM2 ?? 0,
        bedrooms: dto.bedrooms ?? 0,
        bathrooms: dto.bathrooms ?? 0,
        parkingSpots: dto.parkingSpots ?? 0,
        monthlyRentPrice: dto.monthlyRentPrice,
        adminFeePrice: dto.adminFeePrice ?? 0,
        salePrice: dto.salePrice,
        agencyCommissionPct: dto.agencyCommissionPct ?? 10,
        notes: dto.notes,
      },
      include: {
        ownerCustomer: true,
        agentWorker: true,
        branch: true,
      },
    });
  }

  async updatePropertyStatus(
    id: string,
    dto: UpdateRealEstatePropertyStatusDto,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const prop = await this.prisma.realEstateProperty.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!prop) {
      throw new NotFoundException('Inmueble no encontrado.');
    }

    return this.prisma.realEstateProperty.update({
      where: { id: prop.id },
      data: { status: dto.status },
      include: {
        ownerCustomer: true,
        agentWorker: true,
      },
    });
  }

  async findAllLeases(
    organizationId?: string,
    branchId?: string,
    status?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    return this.prisma.realEstateLease.findMany({
      where: {
        organizationId: orgId,
        ...(branchId ? { branchId } : {}),
        ...(status ? { status: status as RealEstateLeaseStatus } : {}),
      },
      include: {
        property: {
          include: { ownerCustomer: true },
        },
        tenantCustomer: true,
        agentWorker: true,
        rentCharges: {
          orderBy: { createdAt: 'desc' },
          include: { serviceOrder: true },
          take: 6,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createLease(dto: CreateRealEstateLeaseDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const property = await this.prisma.realEstateProperty.findFirst({
      where: { id: dto.propertyId, organizationId: orgId },
    });

    if (!property) {
      throw new NotFoundException('El inmueble seleccionado no existe.');
    }

    const branchId = await this.resolveBranchId(
      orgId,
      dto.branchId || property.branchId,
    );

    const tenant = await this.prisma.customer.findFirst({
      where: { id: dto.tenantCustomerId, organizationId: orgId },
    });

    if (!tenant) {
      throw new NotFoundException(
        'El arrendatario/inquilino seleccionado no existe en Clientes.',
      );
    }

    const contractNumber =
      dto.contractNumber?.trim() ||
      `ARR-${Date.now().toString().slice(-6)}`;

    const commissionPct =
      dto.agencyCommissionPct !== undefined
        ? Number(dto.agencyCommissionPct)
        : Number(property.agencyCommissionPct ?? 10);

    const lease = await this.prisma.$transaction(async (tx) => {
      const createdLease = await tx.realEstateLease.create({
        data: {
          organizationId: orgId,
          branchId,
          propertyId: property.id,
          tenantCustomerId: tenant.id,
          agentWorkerId: dto.agentWorkerId || property.agentWorkerId || null,
          contractNumber,
          status: RealEstateLeaseStatus.ACTIVE,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          paymentDay: dto.paymentDay ?? 5,
          monthlyRent: dto.monthlyRent,
          adminFee: dto.adminFee ?? 0,
          securityDeposit: dto.securityDeposit ?? 0,
          agencyCommissionPct: commissionPct,
          coSignerName: dto.coSignerName,
          coSignerPhone: dto.coSignerPhone,
          notes: dto.notes,
        },
        include: {
          property: {
            include: { ownerCustomer: true },
          },
          tenantCustomer: true,
          agentWorker: true,
        },
      });

      await tx.realEstateProperty.update({
        where: { id: property.id },
        data: { status: RealEstatePropertyStatus.RENTED },
      });

      return createdLease;
    });

    if (dto.generateFirstMonthCharge !== false) {
      const startObj = new Date(dto.startDate);
      const periodLabel = `${startObj.getFullYear()}-${String(startObj.getMonth() + 1).padStart(2, '0')}`;
      await this.generateRentCharge(
        {
          organizationId: orgId,
          branchId,
          leaseId: lease.id,
          periodLabel,
          dueDate: dto.startDate,
          notes: 'Primer canon mensual generado al formalizar contrato',
        },
        userId,
      );
    }

    return lease;
  }

  async generateRentCharge(dto: GenerateRentChargeDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const lease = await this.prisma.realEstateLease.findFirst({
      where: { id: dto.leaseId, organizationId: orgId },
      include: {
        property: {
          include: { ownerCustomer: true },
        },
        tenantCustomer: true,
      },
    });

    if (!lease) {
      throw new NotFoundException('Contrato de arrendamiento no encontrado.');
    }

    const existingCharge = await this.prisma.realEstateRentCharge.findUnique({
      where: {
        leaseId_periodLabel: {
          leaseId: lease.id,
          periodLabel: dto.periodLabel.trim(),
        },
      },
      include: {
        serviceOrder: true,
      },
    });

    if (existingCharge) {
      return existingCharge;
    }

    const branchId = await this.resolveBranchId(
      orgId,
      dto.branchId || lease.branchId,
    );

    const rentAmount = Number(lease.monthlyRent ?? 0);
    const adminFeeAmount = Number(lease.adminFee ?? 0);
    const lateFeeAmount = Number(dto.lateFeeAmount ?? 0);
    const totalAmount = rentAmount + adminFeeAmount + lateFeeAmount;

    const agencyCommissionAmount = Math.round(
      (rentAmount * Number(lease.agencyCommissionPct ?? 10)) / 100,
    );
    const ownerNetAmount = Math.max(
      0,
      rentAmount + adminFeeAmount - agencyCommissionAmount,
    );

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const orderNumber = `ORD-ARR-${Date.now().toString().slice(-6)}`;

      const serviceOrder = await tx.serviceOrder.create({
        data: {
          organizationId: orgId,
          branchId,
          orderNumber,
          customerId: lease.tenantCustomerId,
          assignedWorkerId: lease.agentWorkerId || null,
          assetName: `Canon Arriendo ${dto.periodLabel}: ${lease.property.title}`,
          assetIdentifier: `${lease.contractNumber} (${lease.property.code})`,
          initialNotes: `Propietario: ${lease.property.ownerCustomer.firstName} ${lease.property.ownerCustomer.lastName || ''} | Neto Propietario: $${ownerNetAmount}`,
          status: ServiceOrderStatus.COMPLETED,
          laborTotal: totalAmount,
          materialsTotal: 0,
          total: totalAmount,
          tasks: {
            create: [
              {
                assignedWorkerId: lease.agentWorkerId || null,
                description: `Canon Arrendamiento + Administración Periodo ${dto.periodLabel} (${lease.property.title})`,
                price: totalAmount,
                isCompleted: true,
              },
            ],
          },
        },
      });

      return tx.realEstateRentCharge.create({
        data: {
          organizationId: orgId,
          branchId,
          leaseId: lease.id,
          serviceOrderId: serviceOrder.id,
          periodLabel: dto.periodLabel.trim(),
          dueDate,
          rentAmount,
          adminFeeAmount,
          lateFeeAmount,
          totalAmount,
          agencyCommissionAmount,
          ownerNetAmount,
          notes: dto.notes,
        },
        include: {
          lease: {
            include: {
              property: {
                include: { ownerCustomer: true },
              },
              tenantCustomer: true,
            },
          },
          serviceOrder: true,
        },
      });
    });
  }

  async markOwnerDisbursed(
    chargeId: string,
    organizationId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const charge = await this.prisma.realEstateRentCharge.findFirst({
      where: { id: chargeId, organizationId: orgId },
    });

    if (!charge) {
      throw new NotFoundException('Cuenta de cobro de arriendo no encontrada.');
    }

    return this.prisma.realEstateRentCharge.update({
      where: { id: charge.id },
      data: {
        isOwnerDisbursed: !charge.isOwnerDisbursed,
      },
      include: {
        lease: {
          include: {
            property: {
              include: { ownerCustomer: true },
            },
            tenantCustomer: true,
          },
        },
        serviceOrder: true,
      },
    });
  }

  async getConfig(organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'REAL_ESTATE' },
    });

    if (!vertical) {
      throw new NotFoundException(
        'El vertical REAL_ESTATE no está registrado en el catálogo maestro.',
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

    const defaultConfig = {
      defaultAgencyCommissionPct: 10,
      defaultPaymentDay: 5,
      lateFeeInterestPct: 2,
      autoGenerateFirstRentCharge: true,
    };

    return {
      organizationId: orgId,
      verticalCode: 'REAL_ESTATE',
      isActive: orgVertical?.isActive ?? false,
      config: {
        ...defaultConfig,
        ...((orgVertical?.config as Record<string, any>) || {}),
      },
    };
  }

  async updateConfig(dto: UpdateRealEstateConfigDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'REAL_ESTATE' },
    });

    if (!vertical) {
      throw new NotFoundException(
        'El vertical REAL_ESTATE no está registrado en el catálogo maestro.',
      );
    }

    const current = await this.getConfig(orgId, userId);
    const { organizationId: _ignore, ...configUpdates } = dto;
    const mergedConfig = {
      ...current.config,
      ...configUpdates,
    };

    const updated = await this.prisma.organizationVertical.upsert({
      where: {
        organizationId_verticalId: {
          organizationId: orgId,
          verticalId: vertical.id,
        },
      },
      update: {
        config: mergedConfig,
      },
      create: {
        organizationId: orgId,
        verticalId: vertical.id,
        isActive: true,
        config: mergedConfig,
      },
    });

    return {
      organizationId: orgId,
      verticalCode: 'REAL_ESTATE',
      isActive: updated.isActive,
      config: updated.config,
    };
  }
}

