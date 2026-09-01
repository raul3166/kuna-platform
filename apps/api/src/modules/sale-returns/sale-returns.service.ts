import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateSaleReturnDto } from './dto/create-sale-return.dto';
import { UpdateSaleReturnDto } from './dto/update-sale-return.dto';

@Injectable()
export class SaleReturnsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // CREAR DEVOLUCIÓN
  // ============================================================

  async create(dto: CreateSaleReturnDto) {
    /*
     * Validar organización
     */

    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id: dto.organizationId,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found',
      );
    }

    if (!organization.isActive) {
      throw new ConflictException(
        'Organization is inactive',
      );
    }

    /*
     * Validar sucursal
     */

    const branch =
      await this.prisma.branch.findFirst({
        where: {
          id: dto.branchId,
          organizationId:
            dto.organizationId,
        },
      });

    if (!branch) {
      throw new NotFoundException(
        'Branch not found in organization',
      );
    }

    if (!branch.isActive) {
      throw new ConflictException(
        'Branch is inactive',
      );
    }

    /*
     * Validar venta si viene informada
     */

    if (dto.saleId) {
      const sale =
        await this.prisma.sale.findFirst({
          where: {
            id: dto.saleId,
            organizationId:
              dto.organizationId,
          },
        });

      if (!sale) {
        throw new NotFoundException(
          'Sale not found in organization',
        );
      }

      if (
        sale.branchId !== dto.branchId
      ) {
        throw new ConflictException(
          'Sale and return must belong to the same branch',
        );
      }

      if (
        sale.status !== 'CONFIRMED'
      ) {
        throw new ConflictException(
          'Only CONFIRMED sales can receive returns',
        );
      }
    }

    /*
     * Validar cliente
     */

    if (dto.customerId) {
      const customer =
        await this.prisma.customer.findFirst({
          where: {
            id: dto.customerId,
            organizationId:
              dto.organizationId,
          },
        });

      if (!customer) {
        throw new NotFoundException(
          'Customer not found in organization',
        );
      }
    }

    /*
     * Número de devolución
     */

    const existing =
      await this.prisma.saleReturn.findFirst({
        where: {
          organizationId:
            dto.organizationId,

          returnNumber:
            dto.returnNumber,
        },
      });

    if (existing) {
      throw new ConflictException(
        'Return number already exists',
      );
    }

    return this.prisma.saleReturn.create({
      data: {
        organizationId:
          dto.organizationId,

        branchId:
          dto.branchId,

        saleId:
          dto.saleId,

        customerId:
          dto.customerId,

        returnNumber:
          dto.returnNumber,

        returnDate:
          new Date(dto.returnDate),

        reason:
          dto.reason,

        notes:
          dto.notes,

        status:
          'DRAFT',
      },
    });
  }

  // ============================================================
  // LISTAR
  // ============================================================

  async findAll() {
    return this.prisma.saleReturn.findMany({
      include: {
        branch: true,
        sale: true,
        customer: true,

        items: {
          include: {
            product: true,
            saleItem: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ============================================================
  // CONSULTAR
  // ============================================================

  async findOne(id: string) {
    const res =
      await this.prisma.saleReturn.findUnique({
        where: {
          id,
        },

        include: {
          branch: true,
          sale: true,
          customer: true,

          items: {
            include: {
              product: true,
              saleItem: true,
            },
          },
        },
      });

    if (!res) {
      throw new NotFoundException(
        'Sale return not found',
      );
    }

    return res;
  }

  // ============================================================
  // ACTUALIZAR
  // ============================================================

  async update(
    id: string,
    dto: UpdateSaleReturnDto,
  ) {
    const res =
      await this.prisma.saleReturn.findUnique({
        where: {
          id,
        },
      });

    if (!res) {
      throw new NotFoundException(
        'Sale return not found',
      );
    }

    if (res.status !== 'DRAFT') {
      throw new ConflictException(
        'Only DRAFT sale returns can be modified',
      );
    }

    return this.prisma.saleReturn.update({
      where: {
        id,
      },

      data: dto as any,

      include: {
        branch: true,
        sale: true,
        customer: true,

        items: {
          include: {
            product: true,
            saleItem: true,
          },
        },
      },
    });
  }

  // ============================================================
  // ELIMINAR
  // ============================================================

  async remove(id: string) {
    const res =
      await this.prisma.saleReturn.findUnique({
        where: {
          id,
        },
      });

    if (!res) {
      throw new NotFoundException(
        'Sale return not found',
      );
    }

    if (res.status !== 'DRAFT') {
      throw new ConflictException(
        'Only DRAFT sale returns can be deleted',
      );
    }

    return this.prisma.saleReturn.delete({
      where: {
        id,
      },
    });
  }

  // ============================================================
  // CONFIRMAR DEVOLUCIÓN
  // ============================================================

  async confirm(id: string) {
    const res =
      await this.prisma.saleReturn.findUnique({
        where: {
          id,
        },

        include: {
          items: true,
        },
      });

    if (!res) {
      throw new NotFoundException(
        'Return not found',
      );
    }

    if (res.status !== 'DRAFT') {
      throw new ConflictException(
        'Only DRAFT returns can be confirmed',
      );
    }

    if (res.items.length === 0) {
      throw new ConflictException(
        'Cannot confirm empty returns',
      );
    }

    return this.prisma.saleReturn.update({
      where: {
        id,
      },

      data: {
        status: 'CONFIRMED',
      },
    });
  }

  // ============================================================
  // COMPLETAR DEVOLUCIÓN
  // ============================================================

  async complete(id: string) {
    const saleReturn =
      await this.prisma.saleReturn.findUnique({
        where: {
          id,
        },

        include: {
          items: {
            include: {
              product: true,
              saleItem: true,
            },
          },
        },
      });

    if (!saleReturn) {
      throw new NotFoundException(
        'Sale return not found',
      );
    }

    if (
      saleReturn.status !==
      'CONFIRMED'
    ) {
      throw new ConflictException(
        'Only CONFIRMED returns can be completed',
      );
    }

    if (
      saleReturn.items.length === 0
    ) {
      throw new ConflictException(
        'Cannot complete empty returns',
      );
    }

    /*
     * Todo el ingreso a inventario
     * ocurre dentro de una única transacción.
     */

    return this.prisma.$transaction(
      async (tx) => {
        for (
          const item of saleReturn.items
        ) {
          const quantity =
            Number(item.quantity);

          if (
            !Number.isFinite(quantity) ||
            quantity <= 0
          ) {
            throw new ConflictException(
              `Invalid return quantity for product [${item.product.name}]`,
            );
          }

          /*
           * ----------------------------------------------------
           * VALIDAR DEVOLUCIÓN ACUMULADA
           * ----------------------------------------------------
           */

          if (!item.saleItem) {
            throw new ConflictException(
              `Original sale item not found for product [${item.product.name}]`,
            );
          }

          const previousReturns =
            await tx.saleReturnItem.aggregate({
              where: {
                saleItemId:
                  item.saleItemId,

                saleReturn: {
                  status: 'COMPLETED',

                  NOT: {
                    id:
                      saleReturn.id,
                  },
                },
              },

              _sum: {
                quantity: true,
              },
            });

          const alreadyReturned =
            Number(
              previousReturns._sum.quantity ||
                0,
            );

          const originalQuantity =
            Number(
              item.saleItem.quantity,
            );

          if (
            alreadyReturned +
              quantity >
            originalQuantity
          ) {
            throw new ConflictException(
              `Cannot return more than originally sold for product [${item.product.name}]. Sold: ${originalQuantity}, Already returned: ${alreadyReturned}, Current return: ${quantity}`,
            );
          }

          /*
           * ----------------------------------------------------
           * VALIDAR PRODUCTO
           * ----------------------------------------------------
           */

          if (
            item.productId !==
            item.saleItem.productId
          ) {
            throw new ConflictException(
              `Return product does not match original sale item for [${item.product.name}]`,
            );
          }

          /*
           * ----------------------------------------------------
           * STOCK DE SUCURSAL
           * ----------------------------------------------------
           */

          let stockRecord =
            await tx.branchProductStock.findUnique({
              where: {
                branchId_productId: {
                  branchId:
                    saleReturn.branchId,

                  productId:
                    item.productId,
                },
              },
            });

          if (!stockRecord) {
            stockRecord =
              await tx.branchProductStock.create({
                data: {
                  branchId:
                    saleReturn.branchId,

                  productId:
                    item.productId,

                  stock: 0,

                  averageCost:
                    Number(
                      item.unitCost,
                    ),
                },
              });
          }

          const currentBranchStock =
            Number(stockRecord.stock);

          const currentAverageCost =
            Number(
              stockRecord.averageCost,
            );

          const returnUnitCost =
            Number(item.unitCost);

          /*
           * ----------------------------------------------------
           * NUEVO COSTO PROMEDIO
           * ----------------------------------------------------
           */

          const newBranchStock =
            currentBranchStock +
            quantity;

          const newAverageCost =
            currentBranchStock <= 0
              ? returnUnitCost
              : (
                  (
                    currentBranchStock *
                    currentAverageCost
                  ) +
                  (
                    quantity *
                    returnUnitCost
                  )
                ) /
                newBranchStock;

          /*
           * ----------------------------------------------------
           * ACTUALIZAR STOCK SUCURSAL
           * ----------------------------------------------------
           */

          await tx.branchProductStock.update({
            where: {
              id:
                stockRecord.id,
            },

            data: {
              stock:
                newBranchStock,

              averageCost:
                newAverageCost,
            },
          });

          /*
           * ----------------------------------------------------
           * ACTUALIZAR STOCK GLOBAL
           * ----------------------------------------------------
           */

          await tx.product.update({
            where: {
              id:
                item.productId,
            },

            data: {
              stock: {
                increment:
                  quantity,
              },
            },
          });

          /*
           * ----------------------------------------------------
           * KARDEX
           * ----------------------------------------------------
           *
           * CUSTOMER_RETURN se guarda positivo.
           * InventoryMovementsService lo interpreta
           * como entrada.
           */

          await tx.inventoryMovement.create({
            data: {
              organizationId:
                saleReturn.organizationId,

              branchId:
                saleReturn.branchId,

              productId:
                item.productId,

              movementType:
                'CUSTOMER_RETURN',

              quantity,

              unitCost:
                returnUnitCost,

              totalCost:
                quantity *
                returnUnitCost,

              reference:
                `DEV-${saleReturn.returnNumber}`,

              notes:
                item.notes ||
                'Reingreso automático por devolución de cliente en POS.',
            },
          });
        }

        /*
         * ----------------------------------------------------
         * SELLAR DEVOLUCIÓN
         * ----------------------------------------------------
         */

        return tx.saleReturn.update({
          where: {
            id,
          },

          data: {
            status: 'COMPLETED',
          },

          include: {
            branch: true,
            sale: true,
            customer: true,

            items: {
              include: {
                product: true,
                saleItem: true,
              },
            },
          },
        });
      },
    );
  }
}
