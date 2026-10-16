import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateVehicleCheckInDto } from './dto/create-vehicle-check-in.dto';
import { UpdateAutomotiveConfigDto } from './dto/update-automotive-config.dto';
import { ServiceOrderStatus } from '@prisma/client';

@Injectable()
export class AutomotiveService {
  constructor(private readonly prisma: PrismaService) {}

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
   * Métricas y estado del patio/bahías del taller en tiempo real
   */
  async getDashboard(
    organizationId?: string,
    branchId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    // 1. Obtener todas las órdenes de servicio asociadas a vehículos o taller
    const orders = await this.prisma.serviceOrder.findMany({
      where: {
        organizationId: orgId,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        customer: true,
        assignedWorker: true,
        vehicle: true,
        vehicleCheckIn: true,
        tasks: true,
        materials: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Agrupación por columnas de Patio / Taller
    const yardColumns = {
      RECEIVED: orders.filter((o) => o.status === ServiceOrderStatus.PENDING),
      IN_PROGRESS: orders.filter((o) => o.status === ServiceOrderStatus.IN_PROGRESS),
      WAITING_PARTS: orders.filter((o) => o.status === ServiceOrderStatus.WAITING_PARTS),
      COMPLETED: orders.filter((o) => o.status === ServiceOrderStatus.COMPLETED),
      BILLED: orders.filter((o) => o.status === ServiceOrderStatus.BILLED).slice(0, 5),
    };

    // 3. Vehículos en patio actualmente (activos)
    const activeOrders = orders.filter(
      (o) =>
        o.status === ServiceOrderStatus.PENDING ||
        o.status === ServiceOrderStatus.IN_PROGRESS ||
        o.status === ServiceOrderStatus.WAITING_PARTS ||
        o.status === ServiceOrderStatus.COMPLETED,
    );

    const totalActiveVehicles = activeOrders.length;
    const totalLaborInProgress = activeOrders.reduce(
      (acc, o) => acc + Number(o.laborTotal || 0),
      0,
    );
    const totalPartsInProgress = activeOrders.reduce(
      (acc, o) => acc + Number(o.materialsTotal || 0),
      0,
    );

    // 4. Últimos ingresos registrados (check-ins)
    const recentCheckIns = await this.prisma.vehicleCheckIn.findMany({
      where: {
        organizationId: orgId,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        vehicle: {
          include: {
            customer: true,
          },
        },
        serviceOrder: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    // 5. Total de vehículos registrados en la flota del tenant
    const totalRegisteredVehicles = await this.prisma.vehicle.count({
      where: { organizationId: orgId, isActive: true },
    });

    return {
      kpis: {
        totalActiveVehicles,
        totalLaborInProgress,
        totalPartsInProgress,
        totalRegisteredVehicles,
        waitingPartsCount: yardColumns.WAITING_PARTS.length,
        readyCount: yardColumns.COMPLETED.length,
      },
      yardColumns,
      recentCheckIns,
    };
  }

  /**
   * Listar todos los vehículos registrados
   */
  async findAllVehicles(
    organizationId?: string,
    search?: string,
    customerId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    return this.prisma.vehicle.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        ...(customerId ? { customerId } : {}),
        ...(search
          ? {
              OR: [
                { licensePlate: { contains: search, mode: 'insensitive' } },
                { brand: { contains: search, mode: 'insensitive' } },
                { model: { contains: search, mode: 'insensitive' } },
                { vin: { contains: search, mode: 'insensitive' } },
                {
                  customer: {
                    OR: [
                      { firstName: { contains: search, mode: 'insensitive' } },
                      { lastName: { contains: search, mode: 'insensitive' } },
                      { identificationNumber: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            identificationNumber: true,
            phoneNumber: true,
            email: true,
          },
        },
        _count: {
          select: {
            serviceOrders: true,
            checkIns: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Obtener detalle completo y hoja de vida / historial del vehículo
   */
  async findVehicleById(
    id: string,
    organizationId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, organizationId: orgId },
      include: {
        customer: true,
        serviceOrders: {
          include: {
            assignedWorker: true,
            tasks: true,
            materials: {
              include: { product: true },
            },
            sale: {
              select: {
                id: true,
                saleNumber: true,
                status: true,
                total: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        checkIns: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado en la organización');
    }

    return vehicle;
  }

  /**
   * Registrar nuevo vehículo
   */
  async createVehicle(dto: CreateVehicleDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);
    const cleanPlate = dto.licensePlate.trim().toUpperCase();

    const existing = await this.prisma.vehicle.findUnique({
      where: {
        organizationId_licensePlate: {
          organizationId: orgId,
          licensePlate: cleanPlate,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un vehículo registrado con la placa ${cleanPlate} en esta organización.`,
      );
    }

    return this.prisma.vehicle.create({
      data: {
        organizationId: orgId,
        customerId: dto.customerId,
        licensePlate: cleanPlate,
        brand: dto.brand.trim(),
        model: dto.model.trim(),
        year: dto.year,
        color: dto.color?.trim(),
        vin: dto.vin?.trim(),
        mileage: dto.mileage,
        vehicleType: dto.vehicleType,
        fuelType: dto.fuelType?.trim(),
        notes: dto.notes?.trim(),
      },
      include: {
        customer: true,
      },
    });
  }

  /**
   * Actualizar datos del vehículo
   */
  async updateVehicle(
    id: string,
    dto: UpdateVehicleDto,
    organizationId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    await this.findVehicleById(id, orgId);

    const dataToUpdate: any = { ...dto };
    delete dataToUpdate.organizationId;

    if (dto.licensePlate) {
      dataToUpdate.licensePlate = dto.licensePlate.trim().toUpperCase();
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: dataToUpdate,
      include: {
        customer: true,
      },
    });
  }

  /**
   * Registrar hoja de recepción / ingreso técnico (Check-in)
   */
  async createCheckIn(dto: CreateVehicleCheckInDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, organizationId: orgId },
      include: { customer: true },
    });

    if (!vehicle) {
      throw new NotFoundException('El vehículo especificado no existe.');
    }

    // Resolver sucursal
    let branchId = dto.branchId;
    if (!branchId) {
      const firstBranch = await this.prisma.branch.findFirst({
        where: { organizationId: orgId, isActive: true },
      });
      branchId = firstBranch?.id;
    }

    if (!branchId) {
      throw new BadRequestException('No se pudo determinar la sucursal para la recepción.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar kilometraje del vehículo si el nuevo es mayor
      if (dto.mileage && (!vehicle.mileage || dto.mileage > vehicle.mileage)) {
        await tx.vehicle.update({
          where: { id: vehicle.id },
          data: { mileage: dto.mileage },
        });
      }

      // 2. Si se solicitó crear orden de servicio automáticamente
      let createdServiceOrderId: string | undefined = undefined;
      if (dto.createServiceOrder !== false) {
        const orderNumber = `AUT-${Date.now().toString().slice(-6)}`;
        let laborTotal = 0;

        if (dto.serviceItemId) {
          const sItem = await tx.serviceItem.findUnique({
            where: { id: dto.serviceItemId },
          });
          if (sItem) {
            laborTotal = Number(sItem.basePrice || 0);
          }
        }

        const newOrder = await tx.serviceOrder.create({
          data: {
            organizationId: orgId,
            branchId,
            customerId: vehicle.customerId,
            orderNumber,
            vehicleId: vehicle.id,
            assetName: `${vehicle.brand} ${vehicle.model} ${vehicle.year || ''}`.trim(),
            assetIdentifier: vehicle.licensePlate,
            assignedWorkerId: dto.assignedWorkerId,
            serviceItemId: dto.serviceItemId,
            initialNotes: dto.receptionNotes || 'Ingreso por recepción de taller',
            laborTotal,
            materialsTotal: 0,
            total: laborTotal,
            status: ServiceOrderStatus.PENDING,
          },
        });
        createdServiceOrderId = newOrder.id;
      }

      // 3. Crear registro de Check-In
      const checkIn = await tx.vehicleCheckIn.create({
        data: {
          organizationId: orgId,
          branchId,
          vehicleId: vehicle.id,
          serviceOrderId: createdServiceOrderId,
          mileage: dto.mileage,
          fuelLevel: dto.fuelLevel,
          damages: dto.damages,
          inventoryCheck: dto.inventoryCheck,
          customerBelongings: dto.customerBelongings,
          receptionNotes: dto.receptionNotes,
          receivedById: userId,
        },
        include: {
          vehicle: {
            include: { customer: true },
          },
          serviceOrder: true,
        },
      });

      return checkIn;
    });
  }

  /**
   * Obtener configuración del vertical AUTOMOTIVE para la organización
   */
  async getConfig(organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'AUTOMOTIVE' },
    });

    if (!vertical) {
      throw new NotFoundException('El vertical AUTOMOTIVE no está registrado en el catálogo.');
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
      baysCount: 4,
      defaultInventoryChecklist: [
        'Llanta de repuesto',
        'Gato hidráulico',
        'Llave de pernos',
        'Herramientas básicas',
        'Radio / Pantalla',
        'Antena',
        'Documentos (SOAT/Técnica)',
        'Extintor y botiquín',
      ],
      receptionTerms:
        'El taller no se hace responsable por objetos de valor no declarados al momento de la recepción.',
      enableCustomerNotifications: true,
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
   * Actualizar configuración del vertical AUTOMOTIVE
   */
  async updateConfig(
    organizationId: string | undefined,
    dto: UpdateAutomotiveConfigDto,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'AUTOMOTIVE' },
    });

    if (!vertical) {
      throw new NotFoundException('El vertical AUTOMOTIVE no existe.');
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
      message: 'Configuración de Taller Automotriz actualizada exitosamente.',
      config: saved.config,
    };
  }
}

