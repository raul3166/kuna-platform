import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PurchaseReturnStatus,
} from '@prisma/client';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreatePurchaseReturnDto } from './dto/create-purchase-return.dto';
import { UpdatePurchaseReturnDto } from './dto/update-purchase-return.dto';

@Injectable()
export class PurchaseReturnsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createPurchaseReturnDto: CreatePurchaseReturnDto,
  ) {
    /*
     * ORGANIZATION
     */
    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id: createPurchaseReturnDto.organizationId,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found',
      );
    }

    /*
     * SUPPLIER
     */
    const supplier =
      await this.prisma.supplier.findUnique({
        where: {
          id: createPurchaseReturnDto.supplierId,
        },
      });

    if (!supplier) {
      throw new NotFoundException(
        'Supplier not found',
      );
    }

    /*
     * PURCHASE ORDER
     */
    const purchaseOrder =
      await this.prisma.purchaseOrder.findUnique({
        where: {
          id:
            createPurchaseReturnDto.purchaseOrderId,
        },
      });

    if (!purchaseOrder) {
      throw new NotFoundException(
        'Purchase order not found',
      );
    }

    if (
      purchaseOrder.organizationId !==
      createPurchaseReturnDto.organizationId
    ) {
      throw new ConflictException(
        'Purchase order does not belong to the organization',
      );
    }

    if (
      purchaseOrder.supplierId !==
      createPurchaseReturnDto.supplierId
    ) {
      throw new ConflictException(
        'Purchase order supplier does not match return supplier',
      );
    }

    /*
     * GOODS RECEIPT
     */
    if (
      createPurchaseReturnDto.goodsReceiptId
    ) {
      const goodsReceipt =
        await this.prisma.goodsReceipt.findUnique({
          where: {
            id:
              createPurchaseReturnDto.goodsReceiptId,
          },
        });

      if (!goodsReceipt) {
        throw new NotFoundException(
          'Goods receipt not found',
        );
      }

      if (
        goodsReceipt.organizationId !==
        createPurchaseReturnDto.organizationId
      ) {
        throw new ConflictException(
          'Goods receipt does not belong to the organization',
        );
      }

      if (
        goodsReceipt.purchaseOrderId !==
        createPurchaseReturnDto.purchaseOrderId
      ) {
        throw new ConflictException(
          'Goods receipt does not belong to the purchase order',
        );
      }
    }

    /*
     * DUPLICATE NUMBER
     */
    const existingReturn =
      await this.prisma.purchaseReturn.findFirst({
        where: {
          organizationId:
            createPurchaseReturnDto.organizationId,

          number:
            createPurchaseReturnDto.number,
        },
      });

    if (existingReturn) {
      throw new ConflictException(
        'A purchase return with this number already exists',
      );
    }

    /*
     * CREATE
     */
    return this.prisma.purchaseReturn.create({
      data: {
        organizationId:
          createPurchaseReturnDto.organizationId,

        supplierId:
          createPurchaseReturnDto.supplierId,

        purchaseOrderId:
          createPurchaseReturnDto.purchaseOrderId,

        goodsReceiptId:
          createPurchaseReturnDto.goodsReceiptId,

        number:
          createPurchaseReturnDto.number,

        returnDate: new Date(
          createPurchaseReturnDto.returnDate,
        ),

        status:
          PurchaseReturnStatus.DRAFT,

        reason:
          createPurchaseReturnDto.reason,

        notes:
          createPurchaseReturnDto.notes,

        subtotal: 0,
        tax: 0,
        total: 0,
      },
    });
  }

  async findAll() {
    return this.prisma.purchaseReturn.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      include: {
        supplier: {
          select: {
            id: true,
            companyName: true,
          },
        },

        purchaseOrder: {
          select: {
            id: true,
            number: true,
            status: true,
          },
        },

        goodsReceipt: {
          select: {
            id: true,
            number: true,
            receivedDate: true,
          },
        },

        items: {
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
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.getPurchaseReturnOrThrow(id);
  }

  async update(
    id: string,
    updatePurchaseReturnDto: UpdatePurchaseReturnDto,
  ) {
    const purchaseReturn =
      await this.getPurchaseReturnOrThrow(id);

    if (
      purchaseReturn.status !==
      PurchaseReturnStatus.DRAFT
    ) {
      throw new ConflictException(
        'Only draft purchase returns can be modified',
      );
    }

    /*
     * SUPPLIER
     */
    if (
      updatePurchaseReturnDto.supplierId &&
      updatePurchaseReturnDto.supplierId !==
        purchaseReturn.supplierId
    ) {
      const supplier =
        await this.prisma.supplier.findUnique({
          where: {
            id:
              updatePurchaseReturnDto.supplierId,
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
      updatePurchaseReturnDto.purchaseOrderId
    ) {
      const purchaseOrder =
        await this.prisma.purchaseOrder.findUnique({
          where: {
            id:
              updatePurchaseReturnDto.purchaseOrderId,
          },
        });

      if (!purchaseOrder) {
        throw new NotFoundException(
          'Purchase order not found',
        );
      }

      if (
        purchaseOrder.organizationId !==
        purchaseReturn.organizationId
      ) {
        throw new ConflictException(
          'Purchase order does not belong to the organization',
        );
      }

      const supplierId =
        updatePurchaseReturnDto.supplierId ??
        purchaseReturn.supplierId;

      if (
        purchaseOrder.supplierId !==
        supplierId
      ) {
        throw new ConflictException(
          'Purchase order supplier does not match return supplier',
        );
      }
    }

    /*
     * GOODS RECEIPT
     */
    if (
      updatePurchaseReturnDto.goodsReceiptId
    ) {
      const goodsReceipt =
        await this.prisma.goodsReceipt.findUnique({
          where: {
            id:
              updatePurchaseReturnDto.goodsReceiptId,
          },
        });

      if (!goodsReceipt) {
        throw new NotFoundException(
          'Goods receipt not found',
        );
      }

      if (
        goodsReceipt.organizationId !==
        purchaseReturn.organizationId
      ) {
        throw new ConflictException(
          'Goods receipt does not belong to the organization',
        );
      }

      const purchaseOrderId =
        updatePurchaseReturnDto.purchaseOrderId ??
        purchaseReturn.purchaseOrderId;

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
      updatePurchaseReturnDto.number &&
      updatePurchaseReturnDto.number !==
        purchaseReturn.number
    ) {
      const existingReturn =
        await this.prisma.purchaseReturn.findFirst({
          where: {
            organizationId:
              purchaseReturn.organizationId,

            number:
              updatePurchaseReturnDto.number,

            NOT: {
              id,
            },
          },
        });

      if (existingReturn) {
        throw new ConflictException(
          'A purchase return with this number already exists',
        );
      }
    }

    /*
     * UPDATE
     */
    return this.prisma.purchaseReturn.update({
      where: {
        id,
      },

      data: {
        supplierId:
          updatePurchaseReturnDto.supplierId,

        purchaseOrderId:
          updatePurchaseReturnDto.purchaseOrderId,

        goodsReceiptId:
          updatePurchaseReturnDto.goodsReceiptId,

        number:
          updatePurchaseReturnDto.number,

        returnDate:
          updatePurchaseReturnDto.returnDate
            ? new Date(
                updatePurchaseReturnDto.returnDate,
              )
            : undefined,

        reason:
          updatePurchaseReturnDto.reason,

        notes:
          updatePurchaseReturnDto.notes,
      },
    });
  }

  /*
   * CONFIRM
   */
  async confirm(id: string) {
    const purchaseReturn =
      await this.getPurchaseReturnOrThrow(id);

    if (
      purchaseReturn.status !==
      PurchaseReturnStatus.DRAFT
    ) {
      throw new ConflictException(
        'Only draft purchase returns can be confirmed',
      );
    }

    const itemCount =
      await this.prisma.purchaseReturnItem.count({
        where: {
          purchaseReturnId: id,
        },
      });

    if (itemCount === 0) {
      throw new ConflictException(
        'Purchase return must have at least one item',
      );
    }

    return this.prisma.purchaseReturn.update({
      where: {
        id,
      },

      data: {
        status:
          PurchaseReturnStatus.CONFIRMED,
      },
    });
  }

  /*
   * COMPLETE
   *
   * Aquí se genera el movimiento
   * PURCHASE_RETURN y se descuenta stock.
   */
  async complete(id: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const purchaseReturn =
          await tx.purchaseReturn.findUnique({
            where: {
              id,
            },

            include: {
              items: true,
            },
          });

        if (!purchaseReturn) {
          throw new NotFoundException(
            'Purchase return not found',
          );
        }

        if (
          purchaseReturn.status !==
          PurchaseReturnStatus.CONFIRMED
        ) {
          throw new ConflictException(
            'Only confirmed purchase returns can be completed',
          );
        }

        if (
          purchaseReturn.items.length === 0
        ) {
          throw new ConflictException(
            'Purchase return must have at least one item',
          );
        }

        for (
          const item of purchaseReturn.items
        ) {
          /*
           * GOODS RECEIPT ITEM
           */
          const goodsReceiptItem =
            await tx.goodsReceiptItem.findUnique({
              where: {
                id:
                  item.goodsReceiptItemId,
              },
            });

          if (!goodsReceiptItem) {
            throw new NotFoundException(
              'Goods receipt item not found',
            );
          }

          /*
           * PRODUCT
           */
          const product =
            await tx.product.findUnique({
              where: {
                id: item.productId,
              },
            });

          if (!product) {
            throw new NotFoundException(
              'Product not found',
            );
          }

          /*
           * VALIDATE PRODUCT
           */
          if (
            goodsReceiptItem.productId !==
            item.productId
          ) {
            throw new ConflictException(
              'Return item product does not match goods receipt item product',
            );
          }

          /*
           * QUANTITY
           */
          const returnQuantity =
            Number(item.quantity);

          if (returnQuantity <= 0) {
            throw new ConflictException(
              'Return quantity must be greater than zero',
            );
          }

          /*
           * ALREADY RETURNED
           *
           * Solamente contamos devoluciones
           * que ya llegaron a COMPLETED.
           */
          const previousReturns =
            await tx.purchaseReturnItem.findMany({
              where: {
                goodsReceiptItemId:
                  item.goodsReceiptItemId,

                purchaseReturn: {
                  status:
                    PurchaseReturnStatus.COMPLETED,
                },

                NOT: {
                  purchaseReturnId: id,
                },
              },

              select: {
                quantity: true,
              },
            });

          const alreadyReturned =
            previousReturns.reduce(
              (acc, previousItem) =>
                acc +
                Number(previousItem.quantity),
              0,
            );

          const receivedQuantity =
            Number(
              goodsReceiptItem.quantityReceived,
            );

          const availableToReturn =
            receivedQuantity -
            alreadyReturned;

          if (
            returnQuantity >
            availableToReturn
          ) {
            throw new ConflictException(
              `Cannot return ${returnQuantity}. Available quantity to return is ${availableToReturn}`,
            );
          }

          /*
           * STOCK
           */
          const currentStock =
            Number(product.stock);

          if (
            returnQuantity >
            currentStock
          ) {
            throw new ConflictException(
              `Insufficient stock for product ${product.name}`,
            );
          }

          const newStock =
            currentStock -
            returnQuantity;

          /*
           * UPDATE STOCK
           */
          await tx.product.update({
            where: {
              id: product.id,
            },

            data: {
              stock: newStock,
            },
          });

          /*
           * INVENTORY MOVEMENT
           */
          await tx.inventoryMovement.create({
            data: {
              organizationId:
                purchaseReturn.organizationId,

              productId:
                product.id,

              movementType:
                'PURCHASE_RETURN',

              quantity:
                item.quantity,

              unitCost:
                item.unitCost,

              reference:
                purchaseReturn.number,

              notes:
                purchaseReturn.reason ??
                `Purchase return ${purchaseReturn.number}`,
            },
          });
        }

        /*
         * COMPLETE RETURN
         */
        return tx.purchaseReturn.update({
          where: {
            id,
          },

          data: {
            status:
              PurchaseReturnStatus.COMPLETED,
          },

          include: {
            supplier: {
              select: {
                id: true,
                companyName: true,
              },
            },

            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                  },
                },
              },
            },
          },
        });
      },
    );
  }

  /*
   * CANCEL
   */
async cancel(id: string) {
  const purchaseReturn =
    await this.getPurchaseReturnOrThrow(id);

  if (
    purchaseReturn.status !==
    PurchaseReturnStatus.DRAFT
  ) {
    throw new ConflictException(
      'Only draft purchase returns can be cancelled',
    );
  }

  return this.prisma.purchaseReturn.update({
    where: {
      id,
    },

    data: {
      status:
        PurchaseReturnStatus.CANCELLED,
    },
  });
}

  private async getPurchaseReturnOrThrow(
    id: string,
  ) {
    const purchaseReturn =
      await this.prisma.purchaseReturn.findUnique({
        where: {
          id,
        },

        include: {
          supplier: {
            select: {
              id: true,
              companyName: true,
            },
          },

          purchaseOrder: {
            select: {
              id: true,
              number: true,
              status: true,
            },
          },

          goodsReceipt: {
            select: {
              id: true,
              number: true,
              receivedDate: true,
            },
          },

          items: {
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
            },
          },
        },
      });

    if (!purchaseReturn) {
      throw new NotFoundException(
        'Purchase return not found',
      );
    }

    return purchaseReturn;
  }

  async recalculateTotals(
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

    return this.prisma.purchaseReturn.update({
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
