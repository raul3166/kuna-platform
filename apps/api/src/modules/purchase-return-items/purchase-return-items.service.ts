import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PurchaseReturnStatus } from '@prisma/client';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreatePurchaseReturnItemDto } from './dto/create-purchase-return-item.dto';
import { UpdatePurchaseReturnItemDto } from './dto/update-purchase-return-item.dto';

@Injectable()
export class PurchaseReturnItemsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createDto: CreatePurchaseReturnItemDto,
  ) {
    /*
     * PURCHASE RETURN
     */
    const purchaseReturn =
      await this.prisma.purchaseReturn.findUnique({
        where: {
          id:
            createDto.purchaseReturnId,
        },
      });

    if (!purchaseReturn) {
      throw new NotFoundException(
        'Purchase return not found',
      );
    }

    if (
      purchaseReturn.status !==
      PurchaseReturnStatus.DRAFT
    ) {
      throw new ConflictException(
        'Items can only be added to draft purchase returns',
      );
    }

    /*
     * GOODS RECEIPT ITEM
     */
    const goodsReceiptItem =
      await this.prisma.goodsReceiptItem.findUnique({
        where: {
          id:
            createDto.goodsReceiptItemId,
        },

        include: {
          goodsReceipt: true,
        },
      });

    if (!goodsReceiptItem) {
      throw new NotFoundException(
        'Goods receipt item not found',
      );
    }

    /*
     * VALIDATE GOODS RECEIPT
     */
    if (
      purchaseReturn.goodsReceiptId &&
      goodsReceiptItem.goodsReceiptId !==
        purchaseReturn.goodsReceiptId
    ) {
      throw new ConflictException(
        'Goods receipt item does not belong to the purchase return goods receipt',
      );
    }

    /*
     * VALIDATE ORGANIZATION
     */
    if (
      goodsReceiptItem.goodsReceipt
        .organizationId !==
      purchaseReturn.organizationId
    ) {
      throw new ConflictException(
        'Goods receipt item does not belong to the purchase return organization',
      );
    }

    /*
     * PRODUCT
     */
    const product =
      await this.prisma.product.findUnique({
        where: {
          id: createDto.productId,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    /*
     * PRODUCT MUST MATCH RECEIPT ITEM
     */
    if (
      goodsReceiptItem.productId !==
      createDto.productId
    ) {
      throw new ConflictException(
        'Product does not match goods receipt item',
      );
    }

    /*
     * QUANTITY
     */
    const quantity =
      Number(createDto.quantity);

    if (quantity <= 0) {
      throw new ConflictException(
        'Return quantity must be greater than zero',
      );
    }

    /*
     * ALREADY RETURNED
     *
     * Esto incluye devoluciones COMPLETED
     * y CONFIRMED para evitar que se creen
     * devoluciones que posteriormente
     * superen lo recibido.
     */
    const existingItems =
      await this.prisma.purchaseReturnItem.findMany({
        where: {
          goodsReceiptItemId:
            createDto.goodsReceiptItemId,

          purchaseReturn: {
            status: {
              in: [
                PurchaseReturnStatus.CONFIRMED,
                PurchaseReturnStatus.COMPLETED,
              ],
            },
          },
        },

        select: {
          quantity: true,
        },
      });

    const alreadyReturned =
      existingItems.reduce(
        (acc, item) =>
          acc + Number(item.quantity),
        0,
      );

    /*
     * ITEMS DEL MISMO RETURN
     */
    const sameReturnItems =
      await this.prisma.purchaseReturnItem.findMany({
        where: {
          purchaseReturnId:
            createDto.purchaseReturnId,

          goodsReceiptItemId:
            createDto.goodsReceiptItemId,
        },

        select: {
          quantity: true,
        },
      });

    const currentReturnQuantity =
      sameReturnItems.reduce(
        (acc, item) =>
          acc + Number(item.quantity),
        0,
      );

    const receivedQuantity =
      Number(
        goodsReceiptItem.quantityReceived,
      );

    const availableQuantity =
      receivedQuantity -
      alreadyReturned -
      currentReturnQuantity;

    if (
      quantity >
      availableQuantity
    ) {
      throw new ConflictException(
        `Cannot return ${quantity}. Available quantity to return is ${availableQuantity}`,
      );
    }

    /*
     * CREATE ITEM
     */
    const subtotal =
      quantity *
      Number(createDto.unitCost);

    const item =
      await this.prisma.purchaseReturnItem.create({
        data: {
          purchaseReturnId:
            createDto.purchaseReturnId,

          goodsReceiptItemId:
            createDto.goodsReceiptItemId,

          productId:
            createDto.productId,

          quantity:
            createDto.quantity,

          unitCost:
            createDto.unitCost,

          subtotal,

          notes:
            createDto.notes,
        },

        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },

          goodsReceiptItem: {
            select: {
              id: true,
              quantityReceived: true,
            },
          },

          purchaseReturn: {
            select: {
              id: true,
              number: true,
            },
          },
        },
      });

    /*
     * RECALCULATE HEADER
     */
    await this.recalculateTotals(
      createDto.purchaseReturnId,
    );

    return item;
  }

  async findAll() {
    return this.prisma.purchaseReturnItem.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },

        goodsReceiptItem: {
          select: {
            id: true,
            quantityReceived: true,
          },
        },

        purchaseReturn: {
          select: {
            id: true,
            number: true,
            status: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const item =
      await this.prisma.purchaseReturnItem.findUnique({
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

          goodsReceiptItem: {
            select: {
              id: true,
              quantityReceived: true,
            },
          },

          purchaseReturn: {
            select: {
              id: true,
              number: true,
              status: true,
            },
          },
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Purchase return item not found',
      );
    }

    return item;
  }

async update(
  id: string,
  updateDto: UpdatePurchaseReturnItemDto,
) {
  const item =
    await this.prisma.purchaseReturnItem.findUnique({
      where: {
        id,
      },

      include: {
        purchaseReturn: true,
        goodsReceiptItem: true,
      },
    });

  if (!item) {
    throw new NotFoundException(
      'Purchase return item not found',
    );
  }

  if (
    item.purchaseReturn.status !==
    PurchaseReturnStatus.DRAFT
  ) {
    throw new ConflictException(
      'Items can only be modified on draft purchase returns',
    );
  }

  /*
   * PRODUCT
   */
  const productId =
    updateDto.productId ??
    item.productId;

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

  /*
   * PRODUCT MUST MATCH RECEIPT ITEM
   */
  if (
    productId !==
    item.goodsReceiptItem.productId
  ) {
    throw new ConflictException(
      'Product does not match goods receipt item',
    );
  }

  /*
   * QUANTITY
   */
  const quantity =
    Number(
      updateDto.quantity ??
        item.quantity,
    );

  if (quantity <= 0) {
    throw new ConflictException(
      'Return quantity must be greater than zero',
    );
  }

  /*
   * PREVIOUS CONFIRMED / COMPLETED RETURNS
   *
   * Excluimos este mismo item.
   */
  const previousItems =
    await this.prisma.purchaseReturnItem.findMany({
      where: {
        goodsReceiptItemId:
          item.goodsReceiptItemId,

        id: {
          not: id,
        },

        purchaseReturn: {
          status: {
            in: [
              PurchaseReturnStatus.CONFIRMED,
              PurchaseReturnStatus.COMPLETED,
            ],
          },
        },
      },

      select: {
        quantity: true,
      },
    });

  const alreadyReturned =
    previousItems.reduce(
      (acc, previousItem) =>
        acc +
        Number(previousItem.quantity),
      0,
    );

  /*
   * OTHER ITEMS FROM SAME DRAFT
   *
   * Excluimos este mismo item porque
   * estamos reemplazando su cantidad.
   */
  const otherDraftItems =
    await this.prisma.purchaseReturnItem.findMany({
      where: {
        purchaseReturnId:
          item.purchaseReturnId,

        goodsReceiptItemId:
          item.goodsReceiptItemId,

        id: {
          not: id,
        },
      },

      select: {
        quantity: true,
      },
    });

  const currentDraftQuantity =
    otherDraftItems.reduce(
      (acc, draftItem) =>
        acc +
        Number(draftItem.quantity),
      0,
    );

  /*
   * AVAILABLE QUANTITY
   */
  const receivedQuantity =
    Number(
      item.goodsReceiptItem.quantityReceived,
    );

  const availableQuantity =
    receivedQuantity -
    alreadyReturned -
    currentDraftQuantity;

  if (
    quantity >
    availableQuantity
  ) {
    throw new ConflictException(
      `Cannot return ${quantity}. Available quantity to return is ${availableQuantity}`,
    );
  }

  /*
   * UNIT COST
   */
  const unitCost =
    Number(
      updateDto.unitCost ??
        item.unitCost,
    );

  /*
   * SUBTOTAL
   */
  const subtotal =
    quantity *
    unitCost;

  /*
   * UPDATE
   */
  const updated =
    await this.prisma.purchaseReturnItem.update({
      where: {
        id,
      },

      data: {
        productId,
        quantity,
        unitCost,
        subtotal,
        notes:
          updateDto.notes,
      },

      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },

        goodsReceiptItem: {
          select: {
            id: true,
            quantityReceived: true,
          },
        },

        purchaseReturn: {
          select: {
            id: true,
            number: true,
            status: true,
          },
        },
      },
    });

  /*
   * RECALCULATE HEADER
   */
  await this.recalculateTotals(
    item.purchaseReturnId,
  );

  return updated;
}

  async remove(id: string) {
    const item =
      await this.prisma.purchaseReturnItem.findUnique({
        where: {
          id,
        },

        include: {
          purchaseReturn: true,
        },
      });

    if (!item) {
      throw new NotFoundException(
        'Purchase return item not found',
      );
    }

    if (
      item.purchaseReturn.status !==
      PurchaseReturnStatus.DRAFT
    ) {
      throw new ConflictException(
        'Items can only be removed from draft purchase returns',
      );
    }

    await this.prisma.purchaseReturnItem.delete({
      where: {
        id,
      },
    });

    await this.recalculateTotals(
      item.purchaseReturnId,
    );

    return {
      message:
        'Purchase return item removed successfully',
    };
  }

  private async recalculateTotals(
    purchaseReturnId: string,
  ) {
    const items =
      await this.prisma.purchaseReturnItem.findMany({
        where: {
          purchaseReturnId,
        },

        select: {
          subtotal: true,
        },
      });

    const subtotal = items.reduce(
      (acc, item) =>
        acc + Number(item.subtotal),
      0,
    );

    const tax = 0;
    const total = subtotal + tax;

    await this.prisma.purchaseReturn.update({
      where: {
        id: purchaseReturnId,
      },

      data: {
        subtotal,
        tax,
        total,
      },
    });
  }
}
