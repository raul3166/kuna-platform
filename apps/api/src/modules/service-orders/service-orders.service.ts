import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { ServiceOrderStatus, SaleStatus } from '@prisma/client';

@Injectable()
export class ServiceOrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createDto: CreateServiceOrderDto) {
    const orderNumber = createDto.orderNumber || `SO-${Date.now()}`;

    return this.prisma.serviceOrder.create({
      data: {
        organizationId: createDto.organizationId,
        branchId: createDto.branchId!,
        customerId: createDto.customerId,
        orderNumber,
        assetName: createDto.assetName,
        status: createDto.status || ServiceOrderStatus.PENDING,
        ...(createDto.workerId && { assignedWorkerId: createDto.workerId }),
        ...(createDto.notes && { initialNotes: createDto.notes }),
      },
      include: {
        tasks: true,
        materials: true,
      },
    });
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const order = await this.prisma.serviceOrder.findFirst({
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
      throw new NotFoundException(`Orden de servicio con ID ${id} no encontrada`);
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

      let calculatedLaborTotal = 0;
      let calculatedMaterialsTotal = 0;

      for (const task of order.tasks) {
        calculatedLaborTotal += Number(task.price);
      }

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

          // Descontar stock de la sucursal
          await tx.branchProductStock.update({
            where: {
              branchId_productId: {
                branchId: order.branchId,
                productId: product.id,
              },
            },
            data: { stock: { decrement: qty } },
          });

          // Descontar stock global del producto
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: qty } },
          });

          // Registrar en el Kardex (InventoryMovement) sin propiedad 'type' si el esquema usa otra estructura
          await tx.inventoryMovement.create({
            data: {
              organizationId: order.organizationId,
              branchId: order.branchId,
              productId: product.id,
              quantity: qty,
              unitCost: mat.unitCost,
              reference: order.orderNumber,
              notes: `Consumo físico por Orden de Servicio ${order.orderNumber}`,
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
        include: { tasks: true, materials: true, customer: true, assignedWorker: true },
      });
    });
  }

  // --- SPRINT G: Facturación y enlace comercial con Sale ---
  private async billOrder(orderId: string, organizationId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.serviceOrder.findUnique({
        where: { id: orderId, organizationId },
        include: { tasks: true, materials: true, customer: true },
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

      const sale = await tx.sale.create({
        data: {
          organizationId: order.organizationId,
          branchId: order.branchId,
          customerId: order.customerId,
          subtotal: order.total,
          total: order.total,
          status: SaleStatus.CONFIRMED, // Corregido al estado válido del enum
          items: {
            create: [
              ...order.tasks.map((task) => ({
                quantity: 1,
                unitPrice: task.price,
                total: task.price,
              })),
              ...order.materials.map((mat) => ({
                quantity: mat.quantity,
                unitPrice: mat.unitPrice,
                total: mat.total,
                product: {
                  connect: { id: mat.productId },
                },
              })),
            ] as any,
          },
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
