import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GoodsReceiptStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { goodsReceiptSelect } from '../../common/prisma/selects';
import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';

@Injectable()
export class GoodsReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createGoodsReceiptDto: CreateGoodsReceiptDto) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: createGoodsReceiptDto.organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id: createGoodsReceiptDto.purchaseOrderId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (
      purchaseOrder.status !== 'CONFIRMED' &&
      purchaseOrder.status !== 'PARTIALLY_RECEIVED'
    ) {
      throw new ConflictException(
        'Only confirmed or partially received purchase orders can accept goods receipts',
      );
    }

    if (createGoodsReceiptDto.receivedById) {
      const user = await this.prisma.user.findUnique({
        where: { id: createGoodsReceiptDto.receivedById },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    const existingGoodsReceipt = await this.prisma.goodsReceipt.findFirst({
      where: {
        organizationId: createGoodsReceiptDto.organizationId,
        number: createGoodsReceiptDto.number,
      },
    });

    if (existingGoodsReceipt) {
      throw new ConflictException(
        'A goods receipt with this number already exists',
      );
    }

    return this.prisma.goodsReceipt.create({
      data: {
        ...createGoodsReceiptDto,
        receivedDate: new Date(createGoodsReceiptDto.receivedDate),
        status: GoodsReceiptStatus.DRAFT,
      },
      select: goodsReceiptSelect,
    });
  }

  async process(id: string) {
    const goodsReceipt = await this.prisma.goodsReceipt.findUnique({
      where: { id },
      include: {
        purchaseOrder: true,
        items: {
          include: {
            purchaseOrderItem: true,
          },
        },
      },
    });

    if (!goodsReceipt) {
      throw new NotFoundException('Goods receipt not found');
    }

    if (goodsReceipt.status !== GoodsReceiptStatus.DRAFT) {
      throw new ConflictException(
        'Only draft goods receipts can be processed',
      );
    }

    if (goodsReceipt.items.length === 0) {
      throw new ConflictException(
        'Cannot process a goods receipt with no items',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Marcar GoodsReceipt como PROCESSED
      const updatedReceipt = await tx.goodsReceipt.update({
        where: { id },
        data: { status: GoodsReceiptStatus.PROCESSED },
        select: goodsReceiptSelect,
      });

      const branchId = goodsReceipt.purchaseOrder.branchId;

      // 2. Procesar stock para cada ítem
      for (const item of goodsReceipt.items) {
        const qty = Number(item.quantityReceived);
        const unitCost = Number(item.purchaseOrderItem.unitCost);
        const totalCost = qty * unitCost;

        // A. Actualizar stock global del producto
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: qty },
          },
        });

        // B. Actualizar / Crear BranchProductStock y recalcular Costo Promedio
        const existingBranchStock = await tx.branchProductStock.findUnique({
          where: {
            branchId_productId: {
              branchId,
              productId: item.productId,
            },
          },
        });

        if (existingBranchStock) {
          const currentStock = Number(existingBranchStock.stock);
          const currentAvgCost = Number(existingBranchStock.averageCost);

          const newStock = currentStock + qty;
          const newAvgCost =
            newStock > 0
              ? (currentStock * currentAvgCost + qty * unitCost) / newStock
              : unitCost;

          await tx.branchProductStock.update({
            where: { id: existingBranchStock.id },
            data: {
              stock: newStock,
              averageCost: newAvgCost,
            },
          });
        } else {
          await tx.branchProductStock.create({
            data: {
              branchId,
              productId: item.productId,
              stock: qty,
              averageCost: unitCost,
            },
          });
        }

        // C. Crear movimiento de inventario
        await tx.inventoryMovement.create({
          data: {
            organizationId: goodsReceipt.organizationId,
            branchId,
            productId: item.productId,
            movementType: 'PURCHASE',
            quantity: qty,
            unitCost,
            totalCost,
            reference: goodsReceipt.number,
            notes: item.notes || 'Recepción de compra',
          },
        });
      }

      // 3. Actualizar estado de PurchaseOrder (PARTIALLY_RECEIVED / RECEIVED)
      await this.updatePurchaseOrderStatus(tx, goodsReceipt.purchaseOrderId);

      return updatedReceipt;
    });
  }

  async findAll() {
    return this.prisma.goodsReceipt.findMany({
      orderBy: { createdAt: 'desc' },
      select: goodsReceiptSelect,
    });
  }

  async findOne(id: string) {
    return this.getGoodsReceiptOrThrow(id);
  }

  async update(id: string, updateGoodsReceiptDto: UpdateGoodsReceiptDto) {
    const goodsReceipt = await this.getGoodsReceiptOrThrow(id);

    if (goodsReceipt.status !== GoodsReceiptStatus.DRAFT) {
      throw new ConflictException(
        'Only draft goods receipts can be modified',
      );
    }

    if (updateGoodsReceiptDto.receivedById) {
      const user = await this.prisma.user.findUnique({
        where: { id: updateGoodsReceiptDto.receivedById },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    return this.prisma.goodsReceipt.update({
      where: { id },
      data: {
        ...updateGoodsReceiptDto,
        receivedDate: updateGoodsReceiptDto.receivedDate
          ? new Date(updateGoodsReceiptDto.receivedDate)
          : undefined,
      },
      select: goodsReceiptSelect,
    });
  }

  async remove(id: string) {
    const goodsReceipt = await this.getGoodsReceiptOrThrow(id);

    if (goodsReceipt.status !== GoodsReceiptStatus.DRAFT) {
      throw new ConflictException('Only draft goods receipts can be deleted');
    }

    await this.prisma.goodsReceipt.delete({ where: { id } });

    return { message: 'Goods receipt removed successfully' };
  }

  private async getGoodsReceiptOrThrow(id: string) {
    const goodsReceipt = await this.prisma.goodsReceipt.findUnique({
      where: { id },
      select: goodsReceiptSelect,
    });

    if (!goodsReceipt) {
      throw new NotFoundException('Goods receipt not found');
    }

    return goodsReceipt;
  }

  private async updatePurchaseOrderStatus(
    tx: Prisma.TransactionClient,
    purchaseOrderId: string,
  ) {
    const purchaseOrderItems = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId },
      select: { id: true, quantity: true },
    });

    const totalOrdered = purchaseOrderItems.reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    );

    const purchaseOrderItemIds = purchaseOrderItems.map((item) => item.id);

    const processedReceipts = await tx.goodsReceipt.findMany({
      where: {
        purchaseOrderId,
        status: GoodsReceiptStatus.PROCESSED,
      },
      select: { id: true },
    });

    const processedReceiptIds = processedReceipts.map((r) => r.id);

    const received =
      processedReceiptIds.length > 0 && purchaseOrderItemIds.length > 0
        ? await tx.goodsReceiptItem.aggregate({
            where: {
              goodsReceiptId: { in: processedReceiptIds },
              purchaseOrderItemId: { in: purchaseOrderItemIds },
            },
            _sum: { quantityReceived: true },
          })
        : null;

    const totalReceived = Number(received?._sum.quantityReceived ?? 0);

    let status: 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED';

    if (totalReceived === 0) {
      status = 'CONFIRMED';
    } else if (totalReceived < totalOrdered) {
      status = 'PARTIALLY_RECEIVED';
    } else {
      status = 'RECEIVED';
    }

    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status },
    });
  }
}
