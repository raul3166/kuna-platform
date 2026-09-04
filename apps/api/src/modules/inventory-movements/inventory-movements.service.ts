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

  // ============================================================
  // CREAR MOVIMIENTO DE INVENTARIO
  // ============================================================

  async create(
    createDto: CreateInventoryMovementDto,
  ) {
    await this.getOrganizationOrThrow(
      createDto.organizationId,
    );

    return this.prisma.$transaction(
      async (tx) => {
        // ------------------------------------------------------
        // VALIDAR PRODUCTO DENTRO DE LA TRANSACCIÓN
        // ------------------------------------------------------

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

        if (
          product.organizationId !==
          createDto.organizationId
        ) {
          throw new BadRequestException(
            'Product does not belong to the organization',
          );
        }

        if (!product.isActive) {
          throw new BadRequestException(
            'Product is inactive',
          );
        }

        // ------------------------------------------------------
        // VALIDAR CANTIDAD
        // ------------------------------------------------------

        const quantity =
          Number(createDto.quantity);

        if (!Number.isFinite(quantity)) {
          throw new BadRequestException(
            'Quantity must be a valid number',
          );
        }

        if (quantity <= 0) {
          throw new BadRequestException(
            'Quantity must be greater than zero',
          );
        }

        // ------------------------------------------------------
        // TRANSFERENCIAS
        //
        // Las transferencias deben utilizar
        // InventoryTransfersService.
        // ------------------------------------------------------

        if (
          createDto.movementType ===
            InventoryMovementType.TRANSFER_IN ||
          createDto.movementType ===
            InventoryMovementType.TRANSFER_OUT
        ) {
          throw new BadRequestException(
            'Transfers must be created using the inventory transfer endpoint',
          );
        }

        // ------------------------------------------------------
        // ADJUSTMENT
        //
        // Los ajustes utilizan createAdjustment().
        // ------------------------------------------------------

        if (
          createDto.movementType ===
          InventoryMovementType.ADJUSTMENT
        ) {
          throw new BadRequestException(
            'Use the adjustment endpoint for inventory adjustments',
          );
        }

        // ------------------------------------------------------
        // VALIDAR SUCURSAL
        // ------------------------------------------------------

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

        // ------------------------------------------------------
        // STOCK GLOBAL ACTUAL
        // ------------------------------------------------------

        const currentGlobalStock =
          Number(product.stock);

        if (
          !Number.isFinite(
            currentGlobalStock,
          )
        ) {
          throw new BadRequestException(
            'Current global stock is invalid',
          );
        }

        // ------------------------------------------------------
        // STOCK SUCURSAL ACTUAL
        // ------------------------------------------------------

        const currentBranchStock =
          branchStock
            ? Number(branchStock.stock)
            : 0;

        if (
          !Number.isFinite(
            currentBranchStock,
          )
        ) {
          throw new BadRequestException(
            'Current branch stock is invalid',
          );
        }

        // ------------------------------------------------------
        // COSTO PROMEDIO ACTUAL
        // ------------------------------------------------------

        const currentAverageCost =
          branchStock
            ? Number(
                branchStock.averageCost,
              )
            : Number(
                product.costPrice,
              );

        if (
          !Number.isFinite(
            currentAverageCost,
          )
        ) {
          throw new BadRequestException(
            'Current average cost is invalid',
          );
        }

        // ------------------------------------------------------
        // VARIABLES
        // ------------------------------------------------------

        let newGlobalStock =
          currentGlobalStock;

        let newBranchStock =
          currentBranchStock;

        let newAverageCost =
          currentAverageCost;

        let movementUnitCost:
          number | null = null;

        let totalCost = 0;

        // ======================================================
        // INITIAL STOCK
        // ======================================================

        switch (
          createDto.movementType
        ) {
          case InventoryMovementType.INITIAL_STOCK:

            if (
              currentGlobalStock > 0
            ) {
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
              Number(
                createDto.unitCost,
              );

            if (
              !Number.isFinite(
                movementUnitCost,
              )
            ) {
              throw new BadRequestException(
                'Unit cost must be a valid number',
              );
            }

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

            /*
             * El stock inicial se crea en la sucursal
             * indicada y pasa a formar parte del
             * stock global.
             */

            newGlobalStock =
              currentGlobalStock +
              quantity;

            newBranchStock =
              currentBranchStock +
              quantity;

            newAverageCost =
              movementUnitCost;

            break;

          // ====================================================
          // PURCHASE
          // ====================================================

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
              Number(
                createDto.unitCost,
              );

            if (
              !Number.isFinite(
                movementUnitCost,
              )
            ) {
              throw new BadRequestException(
                'Unit cost must be a valid number',
              );
            }

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

            if (
              createDto.branchId
            ) {
              if (
                currentBranchStock <= 0 ||
                currentAverageCost <= 0
              ) {
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
            }

            break;

          // ====================================================
          // SALE
          // ====================================================

          case InventoryMovementType.SALE:

            if (
              quantity >
              currentGlobalStock
            ) {
              throw new BadRequestException(
                'Insufficient global stock',
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

            if (
              createDto.branchId
            ) {
              newBranchStock =
                currentBranchStock -
                quantity;
            }

            break;

          // ====================================================
          // PURCHASE RETURN
          // ====================================================

          case InventoryMovementType.PURCHASE_RETURN:

            if (
              quantity >
              currentGlobalStock
            ) {
              throw new BadRequestException(
                'Insufficient global stock',
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

            if (
              createDto.branchId
            ) {
              newBranchStock =
                currentBranchStock -
                quantity;
            }

            break;

          // ====================================================
          // SALE RETURN
          // ====================================================

          case InventoryMovementType.SALE_RETURN:

            movementUnitCost =
              createDto.unitCost !==
              undefined
                ? Number(
                    createDto.unitCost,
                  )
                : currentAverageCost;

            if (
              !Number.isFinite(
                movementUnitCost,
              )
            ) {
              throw new BadRequestException(
                'Unit cost must be a valid number',
              );
            }

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

            if (
              createDto.branchId
            ) {
              if (
                currentBranchStock <= 0
              ) {
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
            }

            break;

          // ====================================================
          // CUSTOMER RETURN
          // ====================================================

          case InventoryMovementType.CUSTOMER_RETURN:

            movementUnitCost =
              createDto.unitCost !==
              undefined
                ? Number(
                    createDto.unitCost,
                  )
                : currentAverageCost;

            if (
              !Number.isFinite(
                movementUnitCost,
              )
            ) {
              throw new BadRequestException(
                'Unit cost must be a valid number',
              );
            }

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

            /*
             * La devolución de cliente
             * incrementa el stock global.
             */

            newGlobalStock =
              currentGlobalStock +
              quantity;

            if (
              createDto.branchId
            ) {
              /*
               * La mercancía vuelve a la sucursal
               * emisora de la devolución.
               */

              if (
                currentBranchStock <= 0
              ) {
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
            }

            break;

          default:

            throw new BadRequestException(
              'Invalid movement type',
            );
        }

        // ------------------------------------------------------
        // VALIDAR STOCK FINAL
        // ------------------------------------------------------

        if (
          newGlobalStock < 0
        ) {
          throw new BadRequestException(
            'Global stock cannot be negative',
          );
        }

        if (
          createDto.branchId &&
          newBranchStock < 0
        ) {
          throw new BadRequestException(
            'Branch stock cannot be negative',
          );
        }

        // ------------------------------------------------------
        // ACTUALIZAR PRODUCT.STOCK
        // ------------------------------------------------------

        await tx.product.update({
          where: {
            id: product.id,
          },

          data: {
            stock:
              newGlobalStock,
          },
        });

        // ------------------------------------------------------
        // ACTUALIZAR BRANCH PRODUCT STOCK
        // ------------------------------------------------------

        if (
          createDto.branchId
        ) {
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

        // ------------------------------------------------------
        // CREAR INVENTORY MOVEMENT
        // ------------------------------------------------------

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

  // ============================================================
  // AJUSTE DE INVENTARIO
  // ============================================================

  async createAdjustment(
    createDto: CreateInventoryAdjustmentDto,
  ) {
    await this.getOrganizationOrThrow(
      createDto.organizationId,
    );

    return this.prisma.$transaction(
      async (tx) => {
        // ------------------------------------------------------
        // PRODUCTO
        // ------------------------------------------------------

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

        if (
          product.organizationId !==
          createDto.organizationId
        ) {
          throw new BadRequestException(
            'Product does not belong to the organization',
          );
        }

        if (!product.isActive) {
          throw new BadRequestException(
            'Product is inactive',
          );
        }

        // ------------------------------------------------------
        // STOCK FÍSICO
        // ------------------------------------------------------

        const physicalStock =
          Number(createDto.quantity);

        if (
          !Number.isFinite(
            physicalStock,
          )
        ) {
          throw new BadRequestException(
            'Stock must be a valid number',
          );
        }

        if (
          physicalStock < 0
        ) {
          throw new BadRequestException(
            'Stock cannot be negative',
          );
        }

        // ------------------------------------------------------
        // SUCURSAL
        // ------------------------------------------------------

        let branchStock:
          BranchProductStock | null = null;

        if (
          createDto.branchId
        ) {
          const branch =
            await tx.branch.findUnique({
              where: {
                id:
                  createDto.branchId,
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

        // ------------------------------------------------------
        // STOCK ACTUAL
        // ------------------------------------------------------

        const currentGlobalStock =
          Number(product.stock);

        const currentBranchStock =
          branchStock
            ? Number(
                branchStock.stock,
              )
            : 0;

        if (
          !Number.isFinite(
            currentGlobalStock,
          )
        ) {
          throw new BadRequestException(
            'Current global stock is invalid',
          );
        }

        if (
          !Number.isFinite(
            currentBranchStock,
          )
        ) {
          throw new BadRequestException(
            'Current branch stock is invalid',
          );
        }

        // ------------------------------------------------------
        // COSTO PROMEDIO
        // ------------------------------------------------------

        const currentAverageCost =
          branchStock
            ? Number(
                branchStock.averageCost,
              )
            : Number(
                product.costPrice,
              );

        if (
          !Number.isFinite(
            currentAverageCost,
          )
        ) {
          throw new BadRequestException(
            'Current average cost is invalid',
          );
        }

        // ------------------------------------------------------
        // STOCK QUE SE ESTÁ AJUSTANDO
        // ------------------------------------------------------

        const currentStock =
          createDto.branchId
            ? currentBranchStock
            : currentGlobalStock;

        const difference =
          physicalStock -
          currentStock;

        if (
          difference === 0
        ) {
          throw new BadRequestException(
            'Adjustment does not change the current stock',
          );
        }

        // ------------------------------------------------------
        // NUEVOS STOCKS
        // ------------------------------------------------------

        let newGlobalStock =
          currentGlobalStock;

        let newBranchStock =
          currentBranchStock;

        if (
          createDto.branchId
        ) {
          /*
           * El ajuste de una sucursal modifica
           * también el stock global en exactamente
           * la misma diferencia.
           */

          newBranchStock =
            physicalStock;

          newGlobalStock =
            currentGlobalStock +
            difference;
        } else {
          /*
           * Ajuste global.
           */

          newGlobalStock =
            physicalStock;
        }

        // ------------------------------------------------------
        // VALIDAR STOCK FINAL
        // ------------------------------------------------------

        if (
          newGlobalStock < 0
        ) {
          throw new BadRequestException(
            'Global stock cannot be negative',
          );
        }

        if (
          createDto.branchId &&
          newBranchStock < 0
        ) {
          throw new BadRequestException(
            'Branch stock cannot be negative',
          );
        }

        // ------------------------------------------------------
        // COSTO DEL MOVIMIENTO
        // ------------------------------------------------------

        const movementUnitCost =
          currentAverageCost;

        const totalCost =
          difference *
          movementUnitCost;

        // ------------------------------------------------------
        // ACTUALIZAR PRODUCTO
        // ------------------------------------------------------

        await tx.product.update({
          where: {
            id: product.id,
          },

          data: {
            stock:
              newGlobalStock,
          },
        });

        // ------------------------------------------------------
        // ACTUALIZAR SUCURSAL
        // ------------------------------------------------------

        if (
          createDto.branchId
        ) {
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
                currentAverageCost,
            },

            update: {
              stock:
                newBranchStock,

              averageCost:
                currentAverageCost,
            },
          });
        }

        // ------------------------------------------------------
        // NOTAS
        // ------------------------------------------------------

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

        // ------------------------------------------------------
        // CREAR MOVIMIENTO
        // ------------------------------------------------------

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

  // ============================================================
  // LISTAR MOVIMIENTOS
  // ============================================================

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

        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ============================================================
  // BALANCE Y VALORACIÓN
  // ============================================================

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
                Number(
                  branchStock.stock,
                );

              const averageCost =
                Number(
                  branchStock.averageCost,
                );

              const inventoryValue =
                stock *
                averageCost;

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
         * Cuando existen sucursales,
         * la valoración se toma desde
         * BranchProductStock.
         */

        if (
          branches.length === 0
        ) {
          productInventoryValue =
            globalStock *
            Number(
              product.costPrice,
            );
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

  // ============================================================
  // BUSCAR MOVIMIENTO
  // ============================================================

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

          branch: {
            select: {
              id: true,
              name: true,
              code: true,
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

  // ============================================================
  // KARDEX POR PRODUCTO
  // ============================================================

 async findByProduct(productId: string) {
  const product = await this.getProductOrThrow(productId);

  const movements = await this.prisma.inventoryMovement.findMany({
    where: { productId },
    orderBy: [
      { createdAt: 'asc' },
      { id: 'asc' },
    ],
  });

  const tracksStock = product.category?.trackStock ?? true;
  let balance = 0;

  const kardex = movements.map((movement) => {
    const quantity = Number(movement.quantity);
    let entry = 0;
    let exit = 0;

    switch (movement.movementType) {
      case InventoryMovementType.INITIAL_STOCK:
      case InventoryMovementType.PURCHASE:
      case InventoryMovementType.SALE_RETURN:
      case InventoryMovementType.CUSTOMER_RETURN:
      case InventoryMovementType.TRANSFER_IN:
        balance += (movement.movementType === InventoryMovementType.INITIAL_STOCK)
          ? quantity - balance
          : quantity;
        entry = quantity;
        break;

      case InventoryMovementType.SALE:
        // Si la categoría no controla stock, la venta no altera el saldo acumulado del kardex
        if (tracksStock) {
          balance -= quantity;
        }
        exit = quantity;
        break;

      case InventoryMovementType.PURCHASE_RETURN:
      case InventoryMovementType.TRANSFER_OUT:
        balance -= quantity;
        exit = quantity;
        break;

      case InventoryMovementType.ADJUSTMENT:
        balance += quantity;
        if (quantity > 0) entry = quantity;
        else if (quantity < 0) exit = Math.abs(quantity);
        break;

      default:
        break;
    }

    return {
      id: movement.id,
      date: movement.createdAt,
      movementType: movement.movementType,
      movementName: this.getMovementName(movement.movementType),
      reference: movement.reference,
      notes: movement.notes,
      branchId: movement.branchId,
      unitCost: movement.unitCost !== null ? Number(movement.unitCost) : null,
      totalCost: movement.totalCost !== null ? Number(movement.totalCost) : null,
      quantity,
      entry,
      exit,
      balance: tracksStock ? balance : 0,
      affectsStock: tracksStock ? movement.movementType !== InventoryMovementType.SALE : false,
    };
  });

  const currentProductStock = Number(product.stock);
  const kardexCalculatedStock = balance;

  // Si no maneja inventario, el desfase es cero y la auditoría es consistente.
  const stockDifference = tracksStock ? currentProductStock - kardexCalculatedStock : 0;

  return {
    product: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      stock: currentProductStock,
      salePrice: Number(product.salePrice),
      costPrice: Number(product.costPrice),
      categoryId: product.categoryId,
      category: product.category ? {
        id: product.category.id,
        name: product.category.name,
        trackStock: product.category.trackStock,
      } : null,
      supplierId: product.supplierId,
    },
    summary: {
      totalMovements: kardex.length,
      currentStock: currentProductStock,
      kardexStock: kardexCalculatedStock,
      stockDifference,
      isConsistent: stockDifference === 0,
    },
    movements: kardex,
  };
}

  // ============================================================
  // ORGANIZACIÓN
  // ============================================================

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

    if (!organization.isActive) {
      throw new BadRequestException(
        'Organization is inactive',
      );
    }

    return organization;
  }

  // ============================================================
  // PRODUCTO
  // ============================================================

  private async getProductOrThrow(
    id: string,
    organizationId?: string,
  ) {
    const product =
      await this.prisma.product.findUnique({
        where: {
          id,
        },
        include: {
    category: true,
  },
      });

    if (!product) {
      throw new NotFoundException(
        'Product not found',
      );
    }

    if (
      organizationId &&
      product.organizationId !==
        organizationId
    ) {
      throw new BadRequestException(
        'Product does not belong to the organization',
      );
    }

    if (!product.isActive) {
      throw new BadRequestException(
        'Product is inactive',
      );
    }

    return product;
  }

  // ============================================================
  // NOMBRE DEL MOVIMIENTO
  // ============================================================

  private getMovementName(
    movementType: InventoryMovementType,
  ): string {
    switch (
      movementType
    ) {
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

      case InventoryMovementType.CUSTOMER_RETURN:
        return 'Customer Return';

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
