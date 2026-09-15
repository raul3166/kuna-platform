import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { ServiceOrderStatus, SaleStatus, InventoryMovementType, Prisma } from '@prisma/client';

@Injectable()
export class ServiceOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateServiceOrderDto) {
    const orderNumber = createDto.orderNumber || `SO-${Date.now()}`;
    let initialLaborTotal = createDto.laborTotal || 0;

    try {
      if (createDto.serviceItemId && !createDto.laborTotal) {
        const serviceItem = await this.prisma.serviceItem.findUnique({
          where: { id: createDto.serviceItemId },
        });
        if (serviceItem) {
          initialLaborTotal = Number(serviceItem.basePrice || 0);
        }
      }

      return await this.prisma.serviceOrder.create({
        data: {
          organizationId: createDto.organizationId,
          branchId: createDto.branchId!,
          customerId: createDto.customerId,
          orderNumber,
          assetName: createDto.assetName,
          status: createDto.status || ServiceOrderStatus.PENDING,

          ...(createDto.serviceItemId && { serviceItemId: createDto.serviceItemId }),

          laborTotal: initialLaborTotal,
          materialsTotal: 0,
          total: initialLaborTotal,

          ...(createDto.assignedWorkerId && { assignedWorkerId: createDto.assignedWorkerId }),
          ...(createDto.notes && { initialNotes: createDto.notes }),
          ...(createDto.scheduledAt && { scheduledAt: new Date(createDto.scheduledAt) }),
        },
        include: {
          tasks: true,
          materials: true,
          customer: true,
          assignedWorker: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`El número de orden "${orderNumber}" ya existe.`);
        }
        if (error.code === 'P2003') {
          throw new BadRequestException(
            `Referencia inválida: El cliente, técnico o sucursal especificado no existe en la BD.`
          );
        }
      }
      console.error('Error no controlado al crear orden de servicio:', error);
      throw new InternalServerErrorException('Error al crear la orden de servicio');
    }
  }

  async findAll(organizationId: string, status?: ServiceOrderStatus) {
    return this.prisma.serviceOrder.findMany({
      where: {
        organizationId,
        ...(status && { status }),
      },
      include: {
        tasks: true,
        materials: true,
        customer: true,
        assignedWorker: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    let order = await this.prisma.serviceOrder.findFirst({
      where: { id, organizationId },
      include: {
        tasks: true,
        materials: true,
        customer: true,
        assignedWorker: true,
        sale: true,
      },
    });

    if (!order) {
      const exists = await this.prisma.serviceOrder.findUnique({
        where: { id },
        include: {
          tasks: true,
          materials: true,
          customer: true,
          assignedWorker: true,
          sale: true,
        },
      });

      if (exists) {
        console.warn(`[WARN] Orden encontrada con org distinta. Solicitada: ${organizationId}, Real: ${exists.organizationId}`);
        order = exists;
      } else {
        throw new NotFoundException(`Orden de servicio con ID ${id} no encontrada`);
      }
    }

    return order;
  }

  async update(id: string, organizationId: string, updateDto: UpdateServiceOrderDto) {
    const order = await this.findOne(id, organizationId);

    if (order.status !== ServiceOrderStatus.PENDING) {
      throw new ConflictException('Solo las órdenes en estado PENDING pueden ser modificadas directamente.');
    }

    return this.prisma.serviceOrder.update({
      where: { id },
      data: updateDto,
      include: {
        tasks: true,
        materials: true,
      },
    });
  }

  async remove(id: string, organizationId: string) {
    const order = await this.findOne(id, organizationId);

    if (order.status !== ServiceOrderStatus.PENDING) {
      throw new ConflictException('Solo las órdenes en estado PENDING pueden ser eliminadas.');
    }

    return this.prisma.serviceOrder.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, organizationId: string, newStatus: ServiceOrderStatus, userId?: string) {
    await this.findOne(id, organizationId);

    if (newStatus === ServiceOrderStatus.COMPLETED) {
      return this.completeOrder(id, organizationId);
    }

    if (newStatus === ServiceOrderStatus.BILLED) {
      return this.billOrder(id, organizationId, userId || 'system');
    }

    return this.prisma.serviceOrder.update({
      where: { id },
      data: { status: newStatus },
      include: {
        tasks: true,
        materials: true,
        customer: true,
        assignedWorker: true,
      },
    });
  }

  // --- SPRINT F: Cierre, validación de stock y descarga en Kardex ---
  private async completeOrder(orderId: string, organizationId: string) {
  return this.prisma.$transaction(async (tx) => {
    const order = await tx.serviceOrder.findUnique({
      where: { id: orderId, organizationId },
      include: {
        tasks: true,
        serviceItem: true,
        materials: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Orden de servicio no encontrada');
    }

    if (order.status === ServiceOrderStatus.COMPLETED || order.status === ServiceOrderStatus.BILLED) {
      throw new ConflictException('La orden ya se encuentra finalizada o facturada');
    }

    // --- CAMBIO AQUÍ: Cálculo unificado de mano de obra ---
    const serviceBasePrice = Number(order.serviceItem?.basePrice || 0);
    const tasksTotal = order.tasks.reduce((acc, task) => acc + Number(task.price), 0);
    const calculatedLaborTotal = serviceBasePrice + tasksTotal;
    // -----------------------------------------------------

    let calculatedMaterialsTotal = 0;

    for (const mat of order.materials) {
      const qty = Number(mat.quantity);
      const unitPrice = Number(mat.unitPrice);
      const materialLineTotal = qty * unitPrice;
      calculatedMaterialsTotal += materialLineTotal;

      const product = mat.product;
      const trackStock = product.category?.trackStock ?? false;

      if (trackStock) {
        const branchStock = await tx.branchProductStock.findUnique({
          where: {
            branchId_productId: {
              branchId: order.branchId,
              productId: product.id,
            },
          },
        });

        if (!branchStock || Number(branchStock.stock) < qty) {
          throw new BadRequestException(
            `Stock insuficiente en sucursal para el producto: ${product.name}`
          );
        }

        await tx.branchProductStock.update({
          where: {
            branchId_productId: {
              branchId: order.branchId,
              productId: product.id,
            },
          },
          data: { stock: { decrement: qty } },
        });

        await tx.product.update({
          where: { id: product.id },
          data: { stock: { decrement: qty } },
        });

        await tx.inventoryMovement.create({
          data: {
            organizationId: order.organizationId,
            branchId: order.branchId,
            productId: product.id,
            quantity: qty,
            unitCost: mat.unitCost,
            reference: order.orderNumber,
            notes: `Consumo físico por Orden de Servicio ${order.orderNumber}`,
            movementType: InventoryMovementType.SERVICE_CONSUMPTION,
          } as any,
        });
      }

      await tx.serviceOrderMaterial.update({
        where: { id: mat.id },
        data: { total: materialLineTotal },
      });
    }

    const grandTotal = calculatedLaborTotal + calculatedMaterialsTotal;

    return tx.serviceOrder.update({
      where: { id: orderId },
      data: {
        status: ServiceOrderStatus.COMPLETED,
        laborTotal: calculatedLaborTotal,
        materialsTotal: calculatedMaterialsTotal,
        total: grandTotal,
      },
      include: { tasks: true, materials: true, customer: true, assignedWorker: true, serviceItem: true },
    });
  });
}

  // --- SPRINT G: Facturación y enlace comercial con Sale ---
  private async billOrder(orderId: string, organizationId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findUnique({
        where: { id: orderId, organizationId },
        include: { tasks: true, materials: true, customer: true, serviceItem: true },
      });

      if (!order) {
        throw new NotFoundException('Orden de servicio no encontrada');
      }

      if (order.status !== ServiceOrderStatus.COMPLETED) {
        throw new ConflictException('La orden debe estar en estado COMPLETADA para poder facturarse');
      }

      if (order.saleId) {
        throw new ConflictException('Esta orden ya cuenta con una factura asociada');
      }

      const saleItems: any[] = [];

      if (Number(order.laborTotal) > 0) {
        saleItems.push({
          quantity: 1,
          unitPrice: Number(order.laborTotal),
          total: Number(order.laborTotal),
          ...(order.serviceItem?.productId && {
            product: { connect: { id: order.serviceItem.productId } },
          }),
        });
      }

      for (const mat of order.materials) {
        saleItems.push({
          quantity: mat.quantity,
          unitPrice: mat.unitPrice,
          total: mat.total,
          product: { connect: { id: mat.productId } },
        });
      }

      const sale = await tx.sale.create({
        data: {
          organizationId: order.organizationId,
          branchId: order.branchId,
          customerId: order.customerId,
          subtotal: order.total,
          total: order.total,
          status: SaleStatus.CONFIRMED,
          items: { create: saleItems },
        } as any,
      });

      return tx.serviceOrder.update({
        where: { id: orderId },
        data: {
          status: ServiceOrderStatus.BILLED,
          saleId: sale.id,
        },
        include: { sale: true, tasks: true, materials: true },
      });
    });
  }
}
