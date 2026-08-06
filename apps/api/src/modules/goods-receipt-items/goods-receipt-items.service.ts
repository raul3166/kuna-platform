import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';
import {
  productSummarySelect,
} from '../../common/prisma/selects';
import { CreateGoodsReceiptItemDto } from './dto/create-goods-receipt-item.dto';
import { UpdateGoodsReceiptItemDto } from './dto/update-goods-receipt-item.dto';
import { Prisma } from '@prisma/client';
@Injectable()
export class GoodsReceiptItemsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}
async create(
  createGoodsReceiptItemDto: CreateGoodsReceiptItemDto,
) {
  const {
    goodsReceiptId,
    purchaseOrderItemId,
    productId,
    quantityReceived,
    notes,
  } = createGoodsReceiptItemDto;

  // ===========================
  // VALIDACIONES
  // ===========================

  const goodsReceipt =
    await this.prisma.goodsReceipt.findUnique({
      where: {
        id: goodsReceiptId,
      },
      include: {
        purchaseOrder: true,
      },
    });

  if (!goodsReceipt) {
    throw new NotFoundException(
      'Goods receipt not found',
    );
  }

  const purchaseOrderItem =
    await this.prisma.purchaseOrderItem.findUnique({
      where: {
        id: purchaseOrderItemId,
      },
    });

  if (!purchaseOrderItem) {
    throw new NotFoundException(
      'Purchase order item not found',
    );
  }

  const product =
    await this.prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

  if (!product) {
    throw new NotFoundException(
      'Product not found',
    );
  }

  if (
    purchaseOrderItem.purchaseOrderId !==
    goodsReceipt.purchaseOrderId
  ) {
    throw new ConflictException(
      'Purchase order item does not belong to the purchase order',
    );
  }

  if (
    purchaseOrderItem.productId !==
    productId
  ) {
    throw new ConflictException(
      'Product does not match purchase order item',
    );
  }

  const orderedQuantity = Number(
    purchaseOrderItem.quantity,
  );

  const newQuantity = Number(
    quantityReceived,
  );

  if (newQuantity > orderedQuantity) {
    throw new ConflictException(
      'Received quantity cannot exceed ordered quantity',
    );
  }

  const received =
    await this.prisma.goodsReceiptItem.aggregate({
      where: {
        purchaseOrderItemId,
      },
      _sum: {
        quantityReceived: true,
      },
    });

  const alreadyReceived = Number(
    received._sum.quantityReceived ?? 0,
  );

  if (
    alreadyReceived + newQuantity >
    orderedQuantity
  ) {
    throw new ConflictException(
      'Received quantity exceeds ordered quantity',
    );
  }

  // ===========================
  // TRANSACCIÓN
  // ===========================

  return this.prisma.$transaction(
    async (tx) => {
      const goodsReceiptItem =
        await tx.goodsReceiptItem.create({
          data: {
            goodsReceiptId,
            purchaseOrderItemId,
            productId,
            quantityReceived,
            notes,
          },
          include: {
            product: {
              select: productSummarySelect,
            },
          },
        });

      await tx.product.update({
        where: {
          id: productId,
        },
        data: {
          stock: {
            increment: quantityReceived,
          },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          organizationId:
            goodsReceipt.organizationId,

          productId,

          movementType: 'PURCHASE',

          quantity: quantityReceived,

          unitCost:
            purchaseOrderItem.unitCost,

          reference:
            goodsReceipt.number,

          notes,
        },
      });
await this.updatePurchaseOrderStatus(
  tx,
  goodsReceipt.purchaseOrderId,
);
      return goodsReceiptItem;
    },
  );
}

  async findAll() {
  return this.prisma.goodsReceiptItem.findMany({
    include: {
      product: {
        select: productSummarySelect,
      },
      goodsReceipt: {
        select: {
          id: true,
          number: true,
        },
      },
      purchaseOrderItem: {
        select: {
          id: true,
          purchaseOrderId: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

  async findOne(
  id: string,
) {
  const goodsReceiptItem =
    await this.prisma.goodsReceiptItem.findUnique({
      where: {
        id,
      },
      include: {
        product: {
          select: productSummarySelect,
        },
        goodsReceipt: {
          select: {
            id: true,
            number: true,
          },
        },
        purchaseOrderItem: {
          select: {
            id: true,
            purchaseOrderId: true,
          },
        },
      },
    });

  if (!goodsReceiptItem) {
    throw new NotFoundException(
      'Goods receipt item not found',
    );
  }

  return goodsReceiptItem;
}

async update(
  id: string,
  updateGoodsReceiptItemDto: UpdateGoodsReceiptItemDto,
) {

  const existing =
    await this.prisma.goodsReceiptItem.findUnique({
      where: {
        id,
      },
      include: {
        goodsReceipt: true,
      },
    });

  if (!existing) {
    throw new NotFoundException(
      'Goods receipt item not found',
    );
  }

  const purchaseOrderItem =
    await this.prisma.purchaseOrderItem.findUnique({
      where: {
        id: existing.purchaseOrderItemId,
      },
    });

  if (!purchaseOrderItem) {
    throw new NotFoundException(
      'Purchase order item not found',
    );
  }

  const orderedQuantity = Number(
    purchaseOrderItem.quantity,
  );

  const oldQuantity = Number(
    existing.quantityReceived,
  );

  const newQuantity =
    updateGoodsReceiptItemDto.quantityReceived !== undefined
      ? Number(updateGoodsReceiptItemDto.quantityReceived)
      : oldQuantity;

  const received =
    await this.prisma.goodsReceiptItem.aggregate({
      where: {
        purchaseOrderItemId:
          existing.purchaseOrderItemId,
        NOT: {
          id,
        },
      },
      _sum: {
        quantityReceived: true,
      },
    });

  const receivedByOthers = Number(
    received._sum.quantityReceived ?? 0,
  );


  if (
    receivedByOthers + newQuantity >
    orderedQuantity
  ) {
    throw new ConflictException(
      'Received quantity exceeds ordered quantity',
    );
  }

  const difference =
    newQuantity - oldQuantity;

  return this.prisma.$transaction(
    async (tx) => {
      const updatedItem =
        await tx.goodsReceiptItem.update({
          where: {
            id,
          },
          data: {
            quantityReceived:
              updateGoodsReceiptItemDto.quantityReceived,
            notes:
              updateGoodsReceiptItemDto.notes,
          },
          include: {
            product: {
              select: productSummarySelect,
            },
            goodsReceipt: {
              select: {
                id: true,
                number: true,
              },
            },
            purchaseOrderItem: {
              select: {
                id: true,
                purchaseOrderId: true,
              },
            },
          },
        });

      if (difference !== 0) {
        await tx.product.update({
          where: {
            id: existing.productId,
          },
          data: {
            stock: {
              increment: difference,
            },
          },
        });

        await tx.inventoryMovement.create({
          data: {
            organizationId:
              existing.goodsReceipt.organizationId,

            productId:
              existing.productId,

            movementType: 'ADJUSTMENT',

            quantity: difference,

            unitCost:
              purchaseOrderItem.unitCost,

            reference:
              existing.goodsReceipt.number,

            notes:
              'Adjustment after Goods Receipt Item update',
          },
        });
      }
await this.updatePurchaseOrderStatus(
  tx,
  purchaseOrderItem.purchaseOrderId,
);
      return updatedItem;
    },
  );
}

async remove(
  id: string,
) {
  const existing =
    await this.prisma.goodsReceiptItem.findUnique({
      where: {
        id,
      },
      include: {
        goodsReceipt: true,
      },
    });

  if (!existing) {
    throw new NotFoundException(
      'Goods receipt item not found',
    );
  }

  const purchaseOrderItem =
    await this.prisma.purchaseOrderItem.findUnique({
      where: {
        id: existing.purchaseOrderItemId,
      },
    });

  if (!purchaseOrderItem) {
    throw new NotFoundException(
      'Purchase order item not found',
    );
  }

  return this.prisma.$transaction(
    async (tx) => {
      await tx.product.update({
        where: {
          id: existing.productId,
        },
        data: {
          stock: {
            decrement:
              existing.quantityReceived,
          },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          organizationId:
            existing.goodsReceipt.organizationId,

          productId:
            existing.productId,

          movementType: 'ADJUSTMENT',

          quantity:
            -Number(existing.quantityReceived),

          unitCost:
            purchaseOrderItem.unitCost,

          reference:
            existing.goodsReceipt.number,

          notes:
            'Adjustment after Goods Receipt Item deletion',
        },
      });

      await tx.goodsReceiptItem.delete({
        where: {
          id,
        },
      });

      await this.updatePurchaseOrderStatus(
  tx,
  purchaseOrderItem.purchaseOrderId,
);

      return {
        message:
          'Goods receipt item removed successfully',
      };
    },
  );
}
private async updatePurchaseOrderStatus(
  tx: Prisma.TransactionClient,
  purchaseOrderId: string,
) {
  console.log('==============================');
  console.log('ACTUALIZANDO ESTADO OC');
  console.log('purchaseOrderId:', purchaseOrderId);
  // Total ordenado
  const purchaseOrderItems =
    await tx.purchaseOrderItem.findMany({
      where: {
        purchaseOrderId,
      },
      select: {
        id: true,
        quantity: true,
      },
    });
  console.log('purchaseOrderItems:', purchaseOrderItems);

  const totalOrdered =
    purchaseOrderItems.reduce(
      (sum, item) => sum + Number(item.quantity),
      0,
    );
  console.log('totalOrdered:', totalOrdered);

  // Total recibido
  const purchaseOrderItemIds =
    purchaseOrderItems.map((item) => item.id);
  console.log('purchaseOrderItemIds:', purchaseOrderItemIds);

  const received =
    await tx.goodsReceiptItem.aggregate({
      where: {
        purchaseOrderItemId: {
          in: purchaseOrderItemIds,
        },
      },
      _sum: {
        quantityReceived: true,
      },
    });
  console.log('aggregate:', received);

  const totalReceived = Number(
    received._sum.quantityReceived ?? 0,
  );
  console.log('totalReceived:', totalReceived);

  let status: 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED';

  if (totalReceived === 0) {
    status = 'CONFIRMED';
  } else if (totalReceived < totalOrdered) {
    status = 'PARTIALLY_RECEIVED';
  } else {
    status = 'RECEIVED';
  }
  console.log('nuevo status:', status);

  await tx.purchaseOrder.update({
    where: {
      id: purchaseOrderId,
    },
    data: {
      status,
    },
  });
  console.log('OC actualizada');
  console.log('==============================');
}
}
