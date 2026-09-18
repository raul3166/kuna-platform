import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateInternalConsumptionDto } from './dto/create-internal-consumption.dto';
import { InventoryMovementsService } from '../inventory-movements/inventory-movements.service';
import { InventoryMovementType } from '@prisma/client';

export interface FindAllInternalConsumptionsParams {
  organizationId: string;
  branchId?: string;
}

@Injectable()
export class InternalConsumptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryMovementsService: InventoryMovementsService,
  ) {}

  async create(dto: CreateInternalConsumptionDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Generar código consecutivo de folio
      const count = await tx.internalConsumption.count({
        where: { organizationId: dto.organizationId },
      });
      const code = `CONS-${String(count + 1).padStart(5, '0')}`;

      // 2. Crear cabecera del consumo
      const consumption = await tx.internalConsumption.create({
        data: {
          organizationId: dto.organizationId,
          branchId: dto.branchId,
          userId: dto.userId,
          code,
          department: dto.department,
          notes: dto.notes,
        },
      });

      // 3. Registrar cada ítem delegando en InventoryMovementsService (descuenta stock global y de sucursal)
      for (const item of dto.items) {
        await this.inventoryMovementsService.createInTransaction(tx, {
          organizationId: dto.organizationId,
          branchId: dto.branchId,
          productId: item.productId,
          movementType: InventoryMovementType.SERVICE_CONSUMPTION,
          quantity: item.quantity.toString(),
          internalConsumptionId: consumption.id,
          reference: code,
          notes: `Consumo interno ${code}`,
        });
      }

      return consumption;
    });
  }

  async findAll(params: FindAllInternalConsumptionsParams) {
    return this.prisma.internalConsumption.findMany({
      where: {
        organizationId: params.organizationId,
        ...(params.branchId ? { branchId: params.branchId } : {}),
      },
      // En findAll y findOne, actualiza el objeto include:
include: {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  branch: { select: { id: true, name: true } },
  inventoryMovements: {
    include: {
      product: { select: { id: true, sku: true, name: true } }, // <-- Se remueve cost: true
    },
  },
}
      ,
    });
  }

  async findOne(id: string, organizationId: string) {
    const consumption = await this.prisma.internalConsumption.findFirst({
      where: { id, organizationId },
      // En findAll y findOne, actualiza el objeto include:
include: {
  user: { select: { id: true, firstName: true, lastName: true, email: true } },
  branch: { select: { id: true, name: true } },
  inventoryMovements: {
    include: {
      product: { select: { id: true, sku: true, name: true } }, // <-- Se remueve cost: true
    },
  },
},

    });

    if (!consumption) {
      throw new NotFoundException(`Consumo interno con ID ${id} no encontrado`);
    }

    return consumption;
  }
}
