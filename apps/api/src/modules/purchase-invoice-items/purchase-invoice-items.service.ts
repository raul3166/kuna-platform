import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';

import {
  purchaseInvoiceItemSelect,
} from '../../common/prisma/selects';

import { CreatePurchaseInvoiceItemDto } from './dto/create-purchase-invoice-item.dto';
import { UpdatePurchaseInvoiceItemDto } from './dto/update-purchase-invoice-item.dto';

@Injectable()
export class PurchaseInvoiceItemsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createPurchaseInvoiceItemDto: CreatePurchaseInvoiceItemDto,
  ) {
    const purchaseInvoice =
      await this.prisma.purchaseInvoice.findUnique({
        where: {
          id:
            createPurchaseInvoiceItemDto.purchaseInvoiceId,
        },
      });

    if (!purchaseInvoice) {
      throw new NotFoundException(
        'Purchase invoice not found',
      );
    }

    if (purchaseInvoice.status !== 'DRAFT') {
      throw new ConflictException(
        'Items can only be added to draft purchase invoices',
      );
    }

    const product =
      await this.prisma.product.findUnique({
        where: {
          id:
            createPurchaseInvoiceItemDto.productId,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    await this.validateProductRelations(
  purchaseInvoice.id,
  createPurchaseInvoiceItemDto.productId,
);

    const quantity =
      Number(
        createPurchaseInvoiceItemDto.quantity,
      );

    const unitCost =
      Number(
        createPurchaseInvoiceItemDto.unitCost,
      );

    const taxRate =
      Number(
        createPurchaseInvoiceItemDto.taxRate,
      );

    const subtotal =
      quantity * unitCost;

    const tax =
      subtotal * (taxRate / 100);

    const total =
      subtotal + tax;

    const item =
      await this.prisma.purchaseInvoiceItem.create({
        data: {
          purchaseInvoiceId:
            createPurchaseInvoiceItemDto.purchaseInvoiceId,

          productId:
            createPurchaseInvoiceItemDto.productId,

          quantity,

          unitCost,

          taxRate,

          subtotal,

          total,
        },

        select: purchaseInvoiceItemSelect,
      });

    await this.recalculateTotals(
      purchaseInvoice.id,
    );

    return item;
  }

  async findAll() {
    return this.prisma.purchaseInvoiceItem.findMany({
      orderBy: {
        createdAt: 'asc',
      },

      select: purchaseInvoiceItemSelect,
    });
  }

  async findOne(id: string) {
    return this.getPurchaseInvoiceItemOrThrow(id);
  }

  async update(
    id: string,
    updatePurchaseInvoiceItemDto: UpdatePurchaseInvoiceItemDto,
  ) {
    const purchaseInvoiceItem =
      await this.getPurchaseInvoiceItemOrThrow(id);

    const purchaseInvoice =
      await this.prisma.purchaseInvoice.findUnique({
        where: {
          id:
            purchaseInvoiceItem.purchaseInvoiceId,
        },
      });

    if (!purchaseInvoice) {
      throw new NotFoundException(
        'Purchase invoice not found',
      );
    }

    if (purchaseInvoice.status !== 'DRAFT') {
      throw new ConflictException(
        'Items can only be modified on draft purchase invoices',
      );
    }

    if (
      updatePurchaseInvoiceItemDto.productId &&
      updatePurchaseInvoiceItemDto.productId !==
        purchaseInvoiceItem.productId
    ) {
      const product =
        await this.prisma.product.findUnique({
          where: {
            id:
              updatePurchaseInvoiceItemDto.productId,
          },
        });

      if (!product) {
        throw new NotFoundException(
          'Product not found',
        );
      }
    }

    const quantity =
      updatePurchaseInvoiceItemDto.quantity !==
      undefined
        ? Number(
            updatePurchaseInvoiceItemDto.quantity,
          )
        : Number(
            purchaseInvoiceItem.quantity,
          );

    const unitCost =
      updatePurchaseInvoiceItemDto.unitCost !==
      undefined
        ? Number(
            updatePurchaseInvoiceItemDto.unitCost,
          )
        : Number(
            purchaseInvoiceItem.unitCost,
          );

    const taxRate =
      updatePurchaseInvoiceItemDto.taxRate !==
      undefined
        ? Number(
            updatePurchaseInvoiceItemDto.taxRate,
          )
        : Number(
            purchaseInvoiceItem.taxRate,
          );

    const subtotal =
      quantity * unitCost;

    const tax =
      subtotal * (taxRate / 100);

    const total =
      subtotal + tax;

    const item =
      await this.prisma.purchaseInvoiceItem.update({
        where: {
          id,
        },

        data: {
          productId:
            updatePurchaseInvoiceItemDto.productId,

          quantity,

          unitCost,

          taxRate,

          subtotal,

          total,
        },

        select: purchaseInvoiceItemSelect,
      });

    await this.recalculateTotals(
      purchaseInvoice.id,
    );

    return item;
  }

  async remove(id: string) {
    const purchaseInvoiceItem =
      await this.getPurchaseInvoiceItemOrThrow(id);

    const purchaseInvoice =
      await this.prisma.purchaseInvoice.findUnique({
        where: {
          id:
            purchaseInvoiceItem.purchaseInvoiceId,
        },
      });

    if (!purchaseInvoice) {
      throw new NotFoundException(
        'Purchase invoice not found',
      );
    }

    if (purchaseInvoice.status !== 'DRAFT') {
      throw new ConflictException(
        'Items can only be removed from draft purchase invoices',
      );
    }

    await this.prisma.purchaseInvoiceItem.delete({
      where: {
        id,
      },
    });

    await this.recalculateTotals(
      purchaseInvoice.id,
    );

    return {
      message:
        'Purchase invoice item removed successfully',
    };
  }

  private async recalculateTotals(
    purchaseInvoiceId: string,
  ) {
    const items =
      await this.prisma.purchaseInvoiceItem.findMany({
        where: {
          purchaseInvoiceId,
        },

        select: {
          subtotal: true,
          total: true,
        },
      });

    const subtotal = items.reduce(
      (acc, item) =>
        acc + Number(item.subtotal),
      0,
    );

    const total = items.reduce(
      (acc, item) =>
        acc + Number(item.total),
      0,
    );

    const tax = total - subtotal;

    await this.prisma.purchaseInvoice.update({
      where: {
        id: purchaseInvoiceId,
      },

      data: {
        subtotal,
        tax,
        total,
      },
    });
  }

  private async validateProductRelations(
  purchaseInvoiceId: string,
  productId: string,
) {
  const purchaseInvoice =
    await this.prisma.purchaseInvoice.findUnique({
      where: {
        id: purchaseInvoiceId,
      },
      select: {
        purchaseOrderId: true,
        goodsReceiptId: true,
      },
    });

  if (!purchaseInvoice) {
    throw new NotFoundException(
      'Purchase invoice not found',
    );
  }

  if (purchaseInvoice.purchaseOrderId) {
    const purchaseOrderItem =
      await this.prisma.purchaseOrderItem.findFirst({
        where: {
          purchaseOrderId:
            purchaseInvoice.purchaseOrderId,

          productId,
        },
      });

    if (!purchaseOrderItem) {
      throw new ConflictException(
        'Product does not belong to the purchase order',
      );
    }
  }

  if (purchaseInvoice.goodsReceiptId) {
    const goodsReceiptItem =
      await this.prisma.goodsReceiptItem.findFirst({
        where: {
          goodsReceiptId:
            purchaseInvoice.goodsReceiptId,

          productId,
        },
      });

    if (!goodsReceiptItem) {
      throw new ConflictException(
        'Product does not belong to the goods receipt',
      );
    }
  }
}

  private async getPurchaseInvoiceItemOrThrow(
    id: string,
  ) {
    const purchaseInvoiceItem =
      await this.prisma.purchaseInvoiceItem.findUnique({
        where: {
          id,
        },

        select: purchaseInvoiceItemSelect,
      });

    if (!purchaseInvoiceItem) {
      throw new NotFoundException(
        'Purchase invoice item not found',
      );
    }

    return purchaseInvoiceItem;
  }


}
