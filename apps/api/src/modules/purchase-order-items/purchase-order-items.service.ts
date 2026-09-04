import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { purchaseOrderItemSelect } from '../../common/prisma/selects';
import { CreatePurchaseOrderItemDto } from './dto/create-purchase-order-item.dto';
import { UpdatePurchaseOrderItemDto } from './dto/update-purchase-order-item.dto';

@Injectable()
export class PurchaseOrderItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPurchaseOrderItemDto: CreatePurchaseOrderItemDto) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id: createPurchaseOrderItemDto.purchaseOrderId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchaseOrder.status !== 'DRAFT') {
      throw new ConflictException(
        'Items can only be added to draft purchase orders',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: createPurchaseOrderItemDto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.organizationId !== purchaseOrder.organizationId) {
      throw new ConflictException(
        'Product does not belong to the same organization as the purchase order',
      );
    }

    const subtotal =
      createPurchaseOrderItemDto.quantity *
      createPurchaseOrderItemDto.unitCost;

    const item = await this.prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: createPurchaseOrderItemDto.purchaseOrderId,
        productId: createPurchaseOrderItemDto.productId,
        quantity: createPurchaseOrderItemDto.quantity,
        unitCost: createPurchaseOrderItemDto.unitCost,
        subtotal,
        notes: createPurchaseOrderItemDto.notes,
      },
      select: purchaseOrderItemSelect,
    });

    await this.recalculateTotals(createPurchaseOrderItemDto.purchaseOrderId);
    return item;
  }

  async findAll() {
    return this.prisma.purchaseOrderItem.findMany({
      orderBy: { createdAt: 'asc' },
      select: purchaseOrderItemSelect,
    });
  }

  async findOne(id: string) {
    return this.getPurchaseOrderItemOrThrow(id);
  }

  async update(
    id: string,
    updatePurchaseOrderItemDto: UpdatePurchaseOrderItemDto,
  ) {
    const purchaseOrderItem = await this.getPurchaseOrderItemOrThrow(id);

    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderItem.purchaseOrderId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchaseOrder.status !== 'DRAFT') {
      throw new ConflictException(
        'Items can only be modified on draft purchase orders',
      );
    }

    if (
      updatePurchaseOrderItemDto.productId &&
      updatePurchaseOrderItemDto.productId !== purchaseOrderItem.productId
    ) {
      const product = await this.prisma.product.findUnique({
        where: { id: updatePurchaseOrderItemDto.productId },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      if (product.organizationId !== purchaseOrder.organizationId) {
        throw new ConflictException(
          'Product does not belong to the same organization as the purchase order',
        );
      }
    }

    const quantity =
      updatePurchaseOrderItemDto.quantity !== undefined
        ? Number(updatePurchaseOrderItemDto.quantity)
        : Number(purchaseOrderItem.quantity);

    const unitCost =
      updatePurchaseOrderItemDto.unitCost !== undefined
        ? Number(updatePurchaseOrderItemDto.unitCost)
        : Number(purchaseOrderItem.unitCost);

    const subtotal = quantity * unitCost;

    const item = await this.prisma.purchaseOrderItem.update({
      where: { id },
      data: {
        productId: updatePurchaseOrderItemDto.productId,
        quantity,
        unitCost,
        subtotal,
        notes: updatePurchaseOrderItemDto.notes,
      },
      select: purchaseOrderItemSelect,
    });

    await this.recalculateTotals(purchaseOrder.id);
    return item;
  }

  async remove(id: string) {
    const purchaseOrderItem = await this.getPurchaseOrderItemOrThrow(id);

    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderItem.purchaseOrderId },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found');
    }

    if (purchaseOrder.status !== 'DRAFT') {
      throw new ConflictException(
        'Items can only be removed from draft purchase orders',
      );
    }

    await this.prisma.purchaseOrderItem.delete({ where: { id } });

    await this.recalculateTotals(purchaseOrder.id);

    return { message: 'Purchase order item removed successfully' };
  }

  private async recalculateTotals(purchaseOrderId: string) {
    const items = await this.prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId },
      select: { subtotal: true },
    });

    const subtotal = items.reduce(
      (acc, item) => acc + Number(item.subtotal),
      0,
    );

    const tax = 0;
    const total = subtotal + tax;

    await this.prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { subtotal, tax, total },
    });
  }

  private async getPurchaseOrderItemOrThrow(id: string) {
    const purchaseOrderItem = await this.prisma.purchaseOrderItem.findUnique({
      where: { id },
      select: purchaseOrderItemSelect,
    });

    if (!purchaseOrderItem) {
      throw new NotFoundException('Purchase order item not found');
    }

    return purchaseOrderItem;
  }
}
