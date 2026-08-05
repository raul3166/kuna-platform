import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateGoodsReceiptItemDto } from './dto/create-goods-receipt-item.dto';
import { UpdateGoodsReceiptItemDto } from './dto/update-goods-receipt-item.dto';

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

   // Validar que no reciba más de lo pedido
  if (
    Number(createGoodsReceiptItemDto.quantityReceived) >
    Number(purchaseOrderItem.quantity)
  ) {
    throw new ConflictException(
      'Received quantity cannot exceed ordered quantity',
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

  const orderedQuantity = Number(
    purchaseOrderItem.quantity,
  );

  const newQuantity = Number(
    quantityReceived,
  );

  if (
    alreadyReceived + newQuantity >
    orderedQuantity
  ) {
    throw new ConflictException(
      'Received quantity exceeds ordered quantity',
    );
  }

  const goodsReceiptItem =
    await this.prisma.goodsReceiptItem.create({
      data: {
        goodsReceiptId,
        purchaseOrderItemId,
        productId,
        quantityReceived,
        notes,
      },
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
      },
    });

  return goodsReceiptItem;
}

  async findAll() {
  return this.prisma.goodsReceiptItem.findMany({
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
        },
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
          select: {
            id: true,
            sku: true,
            name: true,
          },
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
  const existing = await this.prisma.goodsReceiptItem.findUnique({
    where: {
      id,
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

  const newQuantity =
    updateGoodsReceiptItemDto.quantityReceived !== undefined
      ? Number(updateGoodsReceiptItemDto.quantityReceived)
      : Number(existing.quantityReceived);

  // Sumar todas las demás recepciones del mismo item
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

  return this.prisma.goodsReceiptItem.update({
    where: {
      id,
    },
    data: {
      quantityReceived:
        updateGoodsReceiptItemDto.quantityReceived,
      notes: updateGoodsReceiptItemDto.notes,
    },
    include: {
      product: {
        select: {
          id: true,
          sku: true,
          name: true,
        },
      },
    },
  });
}

  async remove(
  id: string,
) {
  await this.findOne(id);

  await this.prisma.goodsReceiptItem.delete({
    where: {
      id,
    },
  });

  return {
    message:
      'Goods receipt item removed successfully',
  };
}
}
