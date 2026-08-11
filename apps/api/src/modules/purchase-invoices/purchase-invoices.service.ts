import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PurchaseInvoiceStatus,
} from '@prisma/client';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreatePurchaseInvoiceDto } from './dto/create-purchase-invoice.dto';
import { UpdatePurchaseInvoiceDto } from './dto/update-purchase-invoice.dto';

import {
  purchaseInvoiceSelect,
} from '../../common/prisma/selects';

@Injectable()
export class PurchaseInvoicesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createPurchaseInvoiceDto: CreatePurchaseInvoiceDto,
  ) {
    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id: createPurchaseInvoiceDto.organizationId,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found',
      );
    }

    const supplier =
      await this.prisma.supplier.findUnique({
        where: {
          id: createPurchaseInvoiceDto.supplierId,
        },
      });

    if (!supplier) {
      throw new NotFoundException(
        'Supplier not found',
      );
    }

    if (createPurchaseInvoiceDto.purchaseOrderId) {
      const purchaseOrder =
        await this.prisma.purchaseOrder.findUnique({
          where: {
            id: createPurchaseInvoiceDto.purchaseOrderId,
          },
        });

      if (!purchaseOrder) {
        throw new NotFoundException(
          'Purchase order not found',
        );
      }

      if (
        purchaseOrder.organizationId !==
        createPurchaseInvoiceDto.organizationId
      ) {
        throw new ConflictException(
          'Purchase order does not belong to the organization',
        );
      }

      if (
        purchaseOrder.supplierId !==
        createPurchaseInvoiceDto.supplierId
      ) {
        throw new ConflictException(
          'Purchase order supplier does not match invoice supplier',
        );
      }
    }

    if (createPurchaseInvoiceDto.goodsReceiptId) {
      const goodsReceipt =
        await this.prisma.goodsReceipt.findUnique({
          where: {
            id: createPurchaseInvoiceDto.goodsReceiptId,
          },
        });

      if (!goodsReceipt) {
        throw new NotFoundException(
          'Goods receipt not found',
        );
      }

      if (
        goodsReceipt.organizationId !==
        createPurchaseInvoiceDto.organizationId
      ) {
        throw new ConflictException(
          'Goods receipt does not belong to the organization',
        );
      }

      if (
        goodsReceipt.purchaseOrderId !==
        createPurchaseInvoiceDto.purchaseOrderId
      ) {
        throw new ConflictException(
          'Goods receipt does not belong to the purchase order',
        );
      }
    }

    const existingInvoice =
      await this.prisma.purchaseInvoice.findFirst({
        where: {
          organizationId:
            createPurchaseInvoiceDto.organizationId,

          number:
            createPurchaseInvoiceDto.number,
        },
      });

    if (existingInvoice) {
      throw new ConflictException(
        'A purchase invoice with this number already exists',
      );
    }

    return this.prisma.purchaseInvoice.create({
      data: {
        organizationId:
          createPurchaseInvoiceDto.organizationId,

        supplierId:
          createPurchaseInvoiceDto.supplierId,

        purchaseOrderId:
          createPurchaseInvoiceDto.purchaseOrderId,

        goodsReceiptId:
          createPurchaseInvoiceDto.goodsReceiptId,

        number:
          createPurchaseInvoiceDto.number,

        invoiceNumber:
          createPurchaseInvoiceDto.invoiceNumber,

        invoiceDate: new Date(
          createPurchaseInvoiceDto.invoiceDate,
        ),

        dueDate: createPurchaseInvoiceDto.dueDate
          ? new Date(
              createPurchaseInvoiceDto.dueDate,
            )
          : null,

        status:
          PurchaseInvoiceStatus.DRAFT,

        subtotal: 0,

        tax: 0,

        total: 0,

        notes:
          createPurchaseInvoiceDto.notes,
      },

      select: purchaseInvoiceSelect,
    });
  }

  async findAll() {
    return this.prisma.purchaseInvoice.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      select: purchaseInvoiceSelect,
    });
  }

  async findOne(id: string) {
    return this.getPurchaseInvoiceOrThrow(id);
  }

async update(
  id: string,
  updatePurchaseInvoiceDto: UpdatePurchaseInvoiceDto,
) {
  const purchaseInvoice =
    await this.getPurchaseInvoiceOrThrow(id);

  if (
    purchaseInvoice.status !==
    PurchaseInvoiceStatus.DRAFT
  ) {
    throw new ConflictException(
      'Only draft purchase invoices can be modified',
    );
  }

  /*
   * SUPPLIER
   */
  if (
    updatePurchaseInvoiceDto.supplierId &&
    updatePurchaseInvoiceDto.supplierId !==
      purchaseInvoice.supplierId
  ) {
    const supplier =
      await this.prisma.supplier.findUnique({
        where: {
          id:
            updatePurchaseInvoiceDto.supplierId,
        },
      });

    if (!supplier) {
      throw new NotFoundException(
        'Supplier not found',
      );
    }
  }

  /*
   * PURCHASE ORDER
   */
  if (
    updatePurchaseInvoiceDto.purchaseOrderId
  ) {
    const purchaseOrder =
      await this.prisma.purchaseOrder.findUnique({
        where: {
          id:
            updatePurchaseInvoiceDto.purchaseOrderId,
        },
      });

    if (!purchaseOrder) {
      throw new NotFoundException(
        'Purchase order not found',
      );
    }

    if (
      purchaseOrder.organizationId !==
      purchaseInvoice.organizationId
    ) {
      throw new ConflictException(
        'Purchase order does not belong to the organization',
      );
    }

    const supplierId =
      updatePurchaseInvoiceDto.supplierId ??
      purchaseInvoice.supplierId;

    if (
      purchaseOrder.supplierId !==
      supplierId
    ) {
      throw new ConflictException(
        'Purchase order supplier does not match invoice supplier',
      );
    }
  }

  /*
   * GOODS RECEIPT
   */
  if (
    updatePurchaseInvoiceDto.goodsReceiptId
  ) {
    const goodsReceipt =
      await this.prisma.goodsReceipt.findUnique({
        where: {
          id:
            updatePurchaseInvoiceDto.goodsReceiptId,
        },
      });

    if (!goodsReceipt) {
      throw new NotFoundException(
        'Goods receipt not found',
      );
    }

    if (
      goodsReceipt.organizationId !==
      purchaseInvoice.organizationId
    ) {
      throw new ConflictException(
        'Goods receipt does not belong to the organization',
      );
    }

    const purchaseOrderId =
      updatePurchaseInvoiceDto.purchaseOrderId ??
      purchaseInvoice.purchaseOrderId;

    if (
      goodsReceipt.purchaseOrderId !==
      purchaseOrderId
    ) {
      throw new ConflictException(
        'Goods receipt does not belong to the purchase order',
      );
    }
  }

  /*
 * DUPLICATE NUMBER
 */
if (
  updatePurchaseInvoiceDto.number &&
  updatePurchaseInvoiceDto.number !==
    purchaseInvoice.number
) {
  const existingInvoice =
    await this.prisma.purchaseInvoice.findFirst({
      where: {
        organizationId:
          purchaseInvoice.organizationId,

        number:
          updatePurchaseInvoiceDto.number,

        NOT: {
          id,
        },
      },
    });

  if (existingInvoice) {
    throw new ConflictException(
      'A purchase invoice with this number already exists',
    );
  }
}

/*
 * DUPLICATE INVOICE NUMBER
 */
if (
  updatePurchaseInvoiceDto.invoiceNumber &&
  updatePurchaseInvoiceDto.invoiceNumber !==
    purchaseInvoice.invoiceNumber
) {
  const existingInvoice =
    await this.prisma.purchaseInvoice.findFirst({
      where: {
        organizationId:
          purchaseInvoice.organizationId,

        invoiceNumber:
          updatePurchaseInvoiceDto.invoiceNumber,

        NOT: {
          id,
        },
      },
    });

  if (existingInvoice) {
    throw new ConflictException(
      'A purchase invoice with this invoice number already exists',
    );
  }
}
  /*
   * UPDATE
   */
  return this.prisma.purchaseInvoice.update({
    where: {
      id,
    },

    data: {
      supplierId:
        updatePurchaseInvoiceDto.supplierId,

      purchaseOrderId:
        updatePurchaseInvoiceDto.purchaseOrderId,

      goodsReceiptId:
        updatePurchaseInvoiceDto.goodsReceiptId,

      number:
        updatePurchaseInvoiceDto.number,

      invoiceNumber:
        updatePurchaseInvoiceDto.invoiceNumber,

      invoiceDate:
        updatePurchaseInvoiceDto.invoiceDate
          ? new Date(
              updatePurchaseInvoiceDto.invoiceDate,
            )
          : undefined,

      dueDate:
        updatePurchaseInvoiceDto.dueDate
          ? new Date(
              updatePurchaseInvoiceDto.dueDate,
            )
          : undefined,

      notes:
        updatePurchaseInvoiceDto.notes,
    },

    select: purchaseInvoiceSelect,
  });
}

  async cancel(id: string) {
    const purchaseInvoice =
      await this.getPurchaseInvoiceOrThrow(id);

    if (
      purchaseInvoice.status !==
      PurchaseInvoiceStatus.DRAFT
    ) {
      throw new ConflictException(
        'Only draft purchase invoices can be cancelled',
      );
    }

    return this.prisma.purchaseInvoice.update({
      where: {
        id,
      },

      data: {
        status:
          PurchaseInvoiceStatus.CANCELLED,
      },

      select: purchaseInvoiceSelect,
    });
  }

  private async getPurchaseInvoiceOrThrow(
    id: string,
  ) {
    const purchaseInvoice =
      await this.prisma.purchaseInvoice.findUnique({
        where: {
          id,
        },

        select: purchaseInvoiceSelect,
      });

    if (!purchaseInvoice) {
      throw new NotFoundException(
        'Purchase invoice not found',
      );
    }

    return purchaseInvoice;
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
}
