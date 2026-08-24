import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InventoryMovementType,
  BranchProductStock,
} from '@prisma/client';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';

import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';
@Injectable()
export class InventoryMovementsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

async create(
  createDto: CreateInventoryMovementDto,
) {
  await this.getOrganizationOrThrow(
    createDto.organizationId,
  );

  await this.getProductOrThrow(
    createDto.productId,
  );

  return this.prisma.$transaction(
    async (tx) => {
      const product =
        await tx.product.findUnique({
          where: {
            id: createDto.productId,
          },
        });

      if (!product) {
        throw new NotFoundException(
          'Product not found',
        );
      }

      const quantity =
        Number(createDto.quantity);

      if (quantity <= 0) {
        throw new BadRequestException(
          'Quantity must be greater than zero',
        );
      }

      /*
       * --------------------------------------------------
       * VALIDAR SUCURSAL
       * --------------------------------------------------
       */

      let branchStock: BranchProductStock | null =
  null;

      if (createDto.branchId) {
        const branch =
          await tx.branch.findUnique({
            where: {
              id: createDto.branchId,
            },
          });

        if (!branch) {
          throw new NotFoundException(
            'Branch not found',
          );
        }

        if (
          branch.organizationId !==
          createDto.organizationId
        ) {
          throw new BadRequestException(
            'Branch does not belong to the organization',
          );
        }

        if (!branch.isActive) {
          throw new BadRequestException(
            'Branch is inactive',
          );
        }

        branchStock =
          await tx.branchProductStock.findUnique({
            where: {
              branchId_productId: {
                branchId:
                  createDto.branchId,
                productId:
                  createDto.productId,
              },
            },
          });
      }

      /*
       * --------------------------------------------------
       * STOCK GLOBAL
       * --------------------------------------------------
       */

      const currentGlobalStock =
        Number(product.stock);

      /*
       * --------------------------------------------------
       * STOCK DE SUCURSAL
       * --------------------------------------------------
       */

      const currentBranchStock =
        branchStock
          ? Number(branchStock.stock)
          : 0;

      const currentAverageCost =
        branchStock
          ? Number(branchStock.averageCost)
          : 0;

      /*
       * --------------------------------------------------
       * VARIABLES DE COSTEO
       * --------------------------------------------------
       */

      let newGlobalStock =
        currentGlobalStock;

      let newBranchStock =
        currentBranchStock;

      let newAverageCost =
        currentAverageCost;

      let movementUnitCost:
        number | null = null;

      let totalCost = 0;

      /*
       * --------------------------------------------------
       * TIPO DE MOVIMIENTO
       * --------------------------------------------------
       */

      switch (createDto.movementType) {

        /*
         * ================================================
         * INITIAL STOCK
         * ================================================
         */

        case InventoryMovementType.INITIAL_STOCK:

          if (currentGlobalStock > 0) {
            throw new BadRequestException(
              'Initial stock has already been defined',
            );
          }

          if (
            createDto.unitCost ===
            undefined
          ) {
            throw new BadRequestException(
              'Unit cost is required for initial stock',
            );
          }

          movementUnitCost =
            Number(createDto.unitCost);

          if (
            movementUnitCost < 0
          ) {
            throw new BadRequestException(
              'Unit cost cannot be negative',
            );
          }

          totalCost =
            quantity *
            movementUnitCost;

          newGlobalStock =
            quantity;

          newBranchStock =
            quantity;

          newAverageCost =
            movementUnitCost;

          break;

        /*
         * ================================================
         * PURCHASE
         * ================================================
         */

        case InventoryMovementType.PURCHASE:

          if (
            createDto.unitCost ===
            undefined
          ) {
            throw new BadRequestException(
              'Unit cost is required for purchases',
            );
          }

          movementUnitCost =
            Number(createDto.unitCost);

          if (
            movementUnitCost < 0
          ) {
            throw new BadRequestException(
              'Unit cost cannot be negative',
            );
          }

          totalCost =
            quantity *
            movementUnitCost;

          newGlobalStock =
            currentGlobalStock +
            quantity;

          /*
           * Costo promedio ponderado
           */

          if (
  currentBranchStock <= 0 ||
  currentAverageCost <= 0
) {
  newAverageCost = movementUnitCost;
} else {
  newAverageCost =
    (
      (
        currentBranchStock *
        currentAverageCost
      ) +
      (
        quantity *
        movementUnitCost
      )
    ) /
    (
      currentBranchStock +
      quantity
    );
}

          newBranchStock =
            currentBranchStock +
            quantity;

          break;

        /*
         * ================================================
         * SALE
         * ================================================
         */

        case InventoryMovementType.SALE:

          if (
            quantity >
            currentGlobalStock
          ) {
            throw new BadRequestException(
              'Insufficient stock',
            );
          }

          if (
            createDto.branchId &&
            quantity >
            currentBranchStock
          ) {
            throw new BadRequestException(
              'Insufficient stock in branch',
            );
          }

          movementUnitCost =
            currentAverageCost;

          totalCost =
            quantity *
            movementUnitCost;

          newGlobalStock =
            currentGlobalStock -
            quantity;

          newBranchStock =
            currentBranchStock -
            quantity;

          break;

        /*
         * ================================================
         * PURCHASE RETURN
         * ================================================
         */

        case InventoryMovementType.PURCHASE_RETURN:

          if (
            quantity >
            currentGlobalStock
          ) {
            throw new BadRequestException(
              'Insufficient stock',
            );
          }

          if (
            createDto.branchId &&
            quantity >
            currentBranchStock
          ) {
            throw new BadRequestException(
              'Insufficient stock in branch',
            );
          }

          movementUnitCost =
            currentAverageCost;

          totalCost =
            quantity *
            movementUnitCost;

          newGlobalStock =
            currentGlobalStock -
            quantity;

          newBranchStock =
            currentBranchStock -
            quantity;

          break;

        /*
         * ================================================
         * SALE RETURN
         * ================================================
         */

        case InventoryMovementType.SALE_RETURN:

          movementUnitCost =
            createDto.unitCost
              ? Number(
                  createDto.unitCost,
                )
              : currentAverageCost;

          if (
            movementUnitCost < 0
          ) {
            throw new BadRequestException(
              'Unit cost cannot be negative',
            );
          }

          totalCost =
            quantity *
            movementUnitCost;

          newGlobalStock =
            currentGlobalStock +
            quantity;

          /*
           * Si tenemos costo previo,
           * recalculamos promedio.
           */

          if (currentBranchStock <= 0) {
            newAverageCost =
              movementUnitCost;
          } else {
            newAverageCost =
              (
                (
                  currentBranchStock *
                  currentAverageCost
                ) +
                (
                  quantity *
                  movementUnitCost
                )
              ) /
              (
                currentBranchStock +
                quantity
              );
          }

          newBranchStock =
            currentBranchStock +
            quantity;

          break;

        /*
         * ================================================
         * TRANSFER IN
         * ================================================
         */

        case InventoryMovementType.TRANSFER_IN:

          movementUnitCost =
            createDto.unitCost
              ? Number(
                  createDto.unitCost,
                )
              : currentAverageCost;

          if (
            movementUnitCost < 0
          ) {
            throw new BadRequestException(
              'Unit cost cannot be negative',
            );
          }

          totalCost =
            quantity *
            movementUnitCost;

          newGlobalStock =
            currentGlobalStock +
            quantity;

          /*
           * Para una transferencia,
           * el costo recibido entra
           * al costo promedio de la sucursal.
           */

          if (currentBranchStock <= 0) {
            newAverageCost =
              movementUnitCost;
          } else {
            newAverageCost =
              (
                (
                  currentBranchStock *
                  currentAverageCost
                ) +
                (
                  quantity *
                  movementUnitCost
                )
              ) /
              (
                currentBranchStock +
                quantity
              );
          }

          newBranchStock =
            currentBranchStock +
            quantity;

          break;

        /*
         * ================================================
         * TRANSFER OUT
         * ================================================
         */

        case InventoryMovementType.TRANSFER_OUT:

          if (
            quantity >
            currentGlobalStock
          ) {
            throw new BadRequestException(
              'Insufficient stock',
            );
          }

          if (
            createDto.branchId &&
            quantity >
            currentBranchStock
          ) {
            throw new BadRequestException(
              'Insufficient stock in branch',
            );
          }

          movementUnitCost =
            currentAverageCost;

          totalCost =
            quantity *
            movementUnitCost;

          newGlobalStock =
            currentGlobalStock -
            quantity;

          newBranchStock =
            currentBranchStock -
            quantity;

          break;

        /*
         * ================================================
         * ADJUSTMENT
         * ================================================
         */

        case InventoryMovementType.ADJUSTMENT:

          throw new BadRequestException(
            'Use the adjustment endpoint for inventory adjustments',
          );

        /*
         * ================================================
         * DEFAULT
         * ================================================
         */

        default:

          throw new BadRequestException(
            'Invalid movement type',
          );
      }

      /*
       * --------------------------------------------------
       * ACTUALIZAR STOCK GLOBAL
       * --------------------------------------------------
       */

      await tx.product.update({
        where: {
          id: product.id,
        },

        data: {
          stock:
            newGlobalStock,
        },
      });

      /*
       * --------------------------------------------------
       * ACTUALIZAR STOCK DE SUCURSAL
       * --------------------------------------------------
       */

      if (createDto.branchId) {

        await tx.branchProductStock.upsert({
          where: {
            branchId_productId: {
              branchId:
                createDto.branchId,

              productId:
                createDto.productId,
            },
          },

          create: {
            branchId:
              createDto.branchId,

            productId:
              createDto.productId,

            stock:
              newBranchStock,

            averageCost:
              newAverageCost,
          },

          update: {
            stock:
              newBranchStock,

            averageCost:
              newAverageCost,
          },
        });
      }

      /*
       * --------------------------------------------------
       * CREAR MOVIMIENTO
       * --------------------------------------------------
       */

      return tx.inventoryMovement.create({
        data: {

          organizationId:
            createDto.organizationId,

          productId:
            createDto.productId,

          branchId:
            createDto.branchId,

          movementType:
            createDto.movementType,

          quantity:
            createDto.quantity,

          unitCost:
            movementUnitCost,

          totalCost:
            totalCost,

          reference:
            createDto.reference,

          notes:
            createDto.notes,
        },

        include: {

          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              stock: true,
            },
          },

          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });
    },
  );
}

async createAdjustment(
  createDto: CreateInventoryAdjustmentDto,
) {
  await this.getOrganizationOrThrow(
    createDto.organizationId,
  );

  await this.getProductOrThrow(
    createDto.productId,
  );

  return this.prisma.$transaction(
    async (tx) => {
      /*
       * --------------------------------------------------
       * OBTENER PRODUCTO
       * --------------------------------------------------
       */

      const product =
        await tx.product.findUnique({
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
       * --------------------------------------------------
       * VALIDAR STOCK FÍSICO
       * --------------------------------------------------
       */

      const physicalStock =
        Number(createDto.quantity);

      if (physicalStock < 0) {
        throw new BadRequestException(
          'Stock cannot be negative',
        );
      }

      /*
       * --------------------------------------------------
       * VALIDAR SUCURSAL
       * --------------------------------------------------
       */

      let branchStock:
        BranchProductStock | null = null;

      if (createDto.branchId) {
        const branch =
          await tx.branch.findUnique({
            where: {
              id: createDto.branchId,
            },
          });

        if (!branch) {
          throw new NotFoundException(
            'Branch not found',
          );
        }

        if (
          branch.organizationId !==
          createDto.organizationId
        ) {
          throw new BadRequestException(
            'Branch does not belong to the organization',
          );
        }

        if (!branch.isActive) {
          throw new BadRequestException(
            'Branch is inactive',
          );
        }

        branchStock =
          await tx.branchProductStock.findUnique({
            where: {
              branchId_productId: {
                branchId:
                  createDto.branchId,
                productId:
                  createDto.productId,
              },
            },
          });
      }

      /*
       * --------------------------------------------------
       * STOCK ACTUAL
       * --------------------------------------------------
       */

      const currentGlobalStock =
        Number(product.stock);

      const currentBranchStock =
        branchStock
          ? Number(branchStock.stock)
          : 0;

      const currentAverageCost =
        branchStock
          ? Number(branchStock.averageCost)
          : Number(product.costPrice);

      /*
       * --------------------------------------------------
       * DETERMINAR DIFERENCIA
       * --------------------------------------------------
       */

      const currentStock =
        createDto.branchId
          ? currentBranchStock
          : currentGlobalStock;

      const difference =
        physicalStock - currentStock;

      /*
       * --------------------------------------------------
       * VALIDAR QUE REALMENTE HAYA CAMBIO
       * --------------------------------------------------
       */

      if (difference === 0) {
        throw new BadRequestException(
          'Adjustment does not change the current stock',
        );
      }

      /*
       * --------------------------------------------------
       * NUEVOS STOCKS
       * --------------------------------------------------
       */

      let newGlobalStock =
        currentGlobalStock;

      let newBranchStock =
        currentBranchStock;

      /*
       * --------------------------------------------------
       * SI HAY SUCURSAL
       * --------------------------------------------------
       */

      if (createDto.branchId) {
        newBranchStock =
          physicalStock;

        /*
         * El stock global también debe reflejar
         * la diferencia del ajuste.
         */

        newGlobalStock =
          currentGlobalStock +
          difference;
      } else {
        /*
         * Ajuste global
         */

        newGlobalStock =
          physicalStock;
      }

      /*
       * --------------------------------------------------
       * COSTEO DEL AJUSTE
       * --------------------------------------------------
       */

      const movementUnitCost =
        currentAverageCost;

      const totalCost =
        difference *
        movementUnitCost;

      /*
       * --------------------------------------------------
       * ACTUALIZAR STOCK GLOBAL
       * --------------------------------------------------
       */

      await tx.product.update({
        where: {
          id: product.id,
        },

        data: {
          stock:
            newGlobalStock,
        },
      });

      /*
       * --------------------------------------------------
       * ACTUALIZAR STOCK DE SUCURSAL
       * --------------------------------------------------
       */

      if (createDto.branchId) {
        await tx.branchProductStock.upsert({
          where: {
            branchId_productId: {
              branchId:
                createDto.branchId,

              productId:
                createDto.productId,
            },
          },

          create: {
            branchId:
              createDto.branchId,

            productId:
              createDto.productId,

            stock:
              newBranchStock,

            /*
             * El ajuste NO cambia el costo promedio.
             */

            averageCost:
              currentAverageCost,
          },

          update: {
            stock:
              newBranchStock,

            /*
             * Se conserva el costo promedio.
             */

            averageCost:
              currentAverageCost,
          },
        });
      }

      /*
       * --------------------------------------------------
       * NOTAS DEL AJUSTE
       * --------------------------------------------------
       */

      const adjustmentNotes =
        [
          createDto.notes,

          `Previous stock: ${currentStock}`,

          `New stock: ${physicalStock}`,

          `Difference: ${difference}`,

          `Unit cost: ${movementUnitCost}`,
        ]
          .filter(Boolean)
          .join(' | ');

      /*
       * --------------------------------------------------
       * CREAR MOVIMIENTO
       * --------------------------------------------------
       */

      return tx.inventoryMovement.create({
        data: {
          organizationId:
            createDto.organizationId,

          productId:
            createDto.productId,

          branchId:
            createDto.branchId,

          movementType:
            InventoryMovementType.ADJUSTMENT,

          /*
           * MUY IMPORTANTE:
           *
           * Puede ser positivo o negativo.
           *
           * +10 = aumentó inventario
           * -10 = disminuyó inventario
           */

          quantity:
            difference,

          unitCost:
            movementUnitCost,

          totalCost:
            totalCost,

          reference:
            createDto.reference,

          notes:
            adjustmentNotes,
        },

        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              stock: true,
            },
          },

          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });
    },
  );
}

  async findAll() {
    return this.prisma.inventoryMovement.findMany({
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

   /*
   * --------------------------------------------------
   * BALANCE Y VALORACIÓN DE INVENTARIO
   * --------------------------------------------------
   */

  async getStockBalance() {
    const products =
      await this.prisma.product.findMany({
        where: {
          isActive: true,
        },

        select: {
          id: true,
          sku: true,
          name: true,
          stock: true,
          costPrice: true,

          branchStocks: {
            include: {
              branch: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },

            orderBy: {
              branch: {
                name: 'asc',
              },
            },
          },
        },

        orderBy: {
          name: 'asc',
        },
      });

    let totalStock = 0;

    let totalInventoryValue = 0;

    const productBalances =
      products.map((product) => {
        const globalStock =
          Number(product.stock);

        let productInventoryValue = 0;

        const branches =
          product.branchStocks.map(
            (branchStock) => {
              const stock =
                Number(branchStock.stock);

              const averageCost =
                Number(
                  branchStock.averageCost,
                );

              const inventoryValue =
                stock * averageCost;

              productInventoryValue +=
                inventoryValue;

              return {
                branchId:
                  branchStock.branch.id,

                branchName:
                  branchStock.branch.name,

                branchCode:
                  branchStock.branch.code,

                stock,

                averageCost,

                inventoryValue,
              };
            },
          );

        /*
         * Si existen sucursales,
         * la valoración se obtiene
         * desde BranchProductStock.
         *
         * Si no existen sucursales,
         * utilizamos el costo del producto.
         */

        if (branches.length === 0) {
          productInventoryValue =
            globalStock *
            Number(product.costPrice);
        }

        totalStock +=
          globalStock;

        totalInventoryValue +=
          productInventoryValue;

        return {
          productId:
            product.id,

          sku:
            product.sku,

          name:
            product.name,

          totalStock:
            globalStock,

          totalInventoryValue:
            productInventoryValue,

          branches,
        };
      });

    return {
      summary: {
        totalProducts:
          productBalances.length,

        totalStock,

        totalInventoryValue,
      },

      products:
        productBalances,
    };
  }

  async findOne(id: string) {
    const movement =
      await this.prisma.inventoryMovement.findUnique({
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
        },
      });

    if (!movement) {
      throw new NotFoundException(
        'Inventory movement not found',
      );
    }

    return movement;
  }

async findByProduct(productId: string) {
  const product =
    await this.getProductOrThrow(productId);

  const movements =
    await this.prisma.inventoryMovement.findMany({
      where: {
        productId,
      },

      orderBy: [
        {
          createdAt: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });

  let balance = 0;

  const kardex = movements.map((movement) => {
    const quantity =
      Number(movement.quantity);

    let entry = 0;
    let exit = 0;

    switch (movement.movementType) {
      case InventoryMovementType.INITIAL_STOCK:
        balance = quantity;
        entry = quantity;
        break;

      case InventoryMovementType.PURCHASE:
        balance += quantity;
        entry = quantity;
        break;

      case InventoryMovementType.SALE:
        balance -= quantity;
        exit = quantity;
        break;

      case InventoryMovementType.PURCHASE_RETURN:
        balance -= quantity;
        exit = quantity;
        break;

      case InventoryMovementType.SALE_RETURN:
        balance += quantity;
        entry = quantity;
        break;

      case InventoryMovementType.TRANSFER_IN:
        balance += quantity;
        entry = quantity;
        break;

      case InventoryMovementType.TRANSFER_OUT:
        balance -= quantity;
        exit = quantity;
        break;

      case InventoryMovementType.ADJUSTMENT:
        balance += quantity;

        if (quantity > 0) {
          entry = quantity;
        } else if (quantity < 0) {
          exit = Math.abs(quantity);
        }

        break;

      default:
        break;
    }

    return {
      id: movement.id,

      date: movement.createdAt,

      movementType:
        movement.movementType,

      movementName:
        this.getMovementName(
          movement.movementType,
        ),

      reference:
        movement.reference,

      notes:
        movement.notes,

      branchId:
        movement.branchId,

      unitCost:
        movement.unitCost !== null
          ? Number(movement.unitCost)
          : null,

      totalCost:
        movement.totalCost !== null
          ? Number(movement.totalCost)
          : null,

      quantity,

      entry,

      exit,

      balance,
    };
  });

  const currentProductStock =
    Number(product.stock);

  const kardexCalculatedStock =
    balance;

  const stockDifference =
    currentProductStock -
    kardexCalculatedStock;

  return {
    product: {
      id:
        product.id,

      sku:
        product.sku,

      name:
        product.name,

      description:
        product.description,

      stock:
        currentProductStock,

      salePrice:
        Number(product.salePrice),

      costPrice:
        Number(product.costPrice),

      categoryId:
        product.categoryId,

      supplierId:
        product.supplierId,
    },

    summary: {
      totalMovements:
        kardex.length,

      currentStock:
        currentProductStock,

      kardexStock:
        kardexCalculatedStock,

      stockDifference,

      isConsistent:
        stockDifference === 0,
    },

    movements:
      kardex,
  };
}

  private async getOrganizationOrThrow(
    id: string,
  ) {
    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found',
      );
    }

    return organization;
  }

  private async getProductOrThrow(
    id: string,
  ) {
    const product =
      await this.prisma.product.findUnique({
        where: {
          id,
        },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    return product;
  }

  private getMovementName(
  movementType: InventoryMovementType,
): string {
  switch (movementType) {
    case InventoryMovementType.INITIAL_STOCK:
      return 'Initial Stock';

    case InventoryMovementType.PURCHASE:
      return 'Purchase';

    case InventoryMovementType.SALE:
      return 'Sale';

    case InventoryMovementType.PURCHASE_RETURN:
      return 'Purchase Return';

    case InventoryMovementType.SALE_RETURN:
      return 'Sale Return';

    case InventoryMovementType.TRANSFER_IN:
      return 'Transfer In';

    case InventoryMovementType.TRANSFER_OUT:
      return 'Transfer Out';

    case InventoryMovementType.ADJUSTMENT:
      return 'Inventory Adjustment';

    default:
      return movementType;
  }
}
}
