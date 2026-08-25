import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InventoryMovementType } from '@prisma/client';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateInventoryTransferDto } from './dto/create-inventory-transfer.dto';

@Injectable()
export class InventoryTransfersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    createDto: CreateInventoryTransferDto,
  ) {
    /*
     * --------------------------------------------------
     * VALIDAR ORGANIZACIÓN
     * --------------------------------------------------
     */

    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id:
            createDto.organizationId,
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

    /*
     * --------------------------------------------------
     * VALIDAR PRODUCTO
     * --------------------------------------------------
     */

    const product =
      await this.prisma.product.findUnique({
        where: {
          id:
            createDto.productId,
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
      throw new ConflictException(
        'Product does not belong to the organization',
      );
    }

    if (!product.isActive) {
      throw new BadRequestException(
        'Product is inactive',
      );
    }

    /*
     * --------------------------------------------------
     * VALIDAR SUCURSAL ORIGEN
     * --------------------------------------------------
     */

    const sourceBranch =
      await this.prisma.branch.findUnique({
        where: {
          id:
            createDto.sourceBranchId,
        },
      });

    if (!sourceBranch) {
      throw new NotFoundException(
        'Source branch not found',
      );
    }

    if (
      sourceBranch.organizationId !==
      createDto.organizationId
    ) {
      throw new ConflictException(
        'Source branch does not belong to the organization',
      );
    }

    if (!sourceBranch.isActive) {
      throw new BadRequestException(
        'Source branch is inactive',
      );
    }

    /*
     * --------------------------------------------------
     * VALIDAR SUCURSAL DESTINO
     * --------------------------------------------------
     */

    const destinationBranch =
      await this.prisma.branch.findUnique({
        where: {
          id:
            createDto.destinationBranchId,
        },
      });

    if (!destinationBranch) {
      throw new NotFoundException(
        'Destination branch not found',
      );
    }

    if (
      destinationBranch.organizationId !==
      createDto.organizationId
    ) {
      throw new ConflictException(
        'Destination branch does not belong to the organization',
      );
    }

    if (!destinationBranch.isActive) {
      throw new BadRequestException(
        'Destination branch is inactive',
      );
    }

    /*
     * --------------------------------------------------
     * VALIDAR SUCURSALES DIFERENTES
     * --------------------------------------------------
     */

    if (
      createDto.sourceBranchId ===
      createDto.destinationBranchId
    ) {
      throw new ConflictException(
        'Source and destination branches must be different',
      );
    }

    /*
     * --------------------------------------------------
     * VALIDAR CANTIDAD
     * --------------------------------------------------
     */

    const quantity =
      Number(createDto.quantity);

    if (
      !Number.isFinite(quantity)
    ) {
      throw new BadRequestException(
        'Transfer quantity must be a valid number',
      );
    }

    if (
      quantity <= 0
    ) {
      throw new BadRequestException(
        'Transfer quantity must be greater than zero',
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        /*
         * --------------------------------------------------
         * STOCK DE LA SUCURSAL ORIGEN
         * --------------------------------------------------
         */

        const sourceStock =
          await tx.branchProductStock.findUnique({
            where: {
              branchId_productId: {
                branchId:
                  createDto.sourceBranchId,

                productId:
                  createDto.productId,
              },
            },
          });

        const sourceCurrentStock =
          sourceStock
            ? Number(
                sourceStock.stock,
              )
            : 0;

        if (
          !Number.isFinite(
            sourceCurrentStock,
          )
        ) {
          throw new BadRequestException(
            'Source branch stock is invalid',
          );
        }

        /*
         * Costo promedio de la sucursal origen.
         */

        const sourceAverageCost =
          sourceStock
            ? Number(
                sourceStock.averageCost,
              )
            : 0;

        if (
          !Number.isFinite(
            sourceAverageCost,
          )
        ) {
          throw new BadRequestException(
            'Source branch average cost is invalid',
          );
        }

        /*
         * --------------------------------------------------
         * VALIDAR STOCK SUFICIENTE
         * --------------------------------------------------
         */

        if (
          quantity >
          sourceCurrentStock
        ) {
          throw new ConflictException(
            'Insufficient stock in source branch',
          );
        }

        /*
         * --------------------------------------------------
         * STOCK DE LA SUCURSAL DESTINO
         * --------------------------------------------------
         */

        const destinationStock =
          await tx.branchProductStock.findUnique({
            where: {
              branchId_productId: {
                branchId:
                  createDto.destinationBranchId,

                productId:
                  createDto.productId,
              },
            },
          });

        const destinationCurrentStock =
          destinationStock
            ? Number(
                destinationStock.stock,
              )
            : 0;

        if (
          !Number.isFinite(
            destinationCurrentStock,
          )
        ) {
          throw new BadRequestException(
            'Destination branch stock is invalid',
          );
        }

        /*
         * Costo promedio actual
         * de la sucursal destino.
         */

        const destinationAverageCost =
          destinationStock
            ? Number(
                destinationStock.averageCost,
              )
            : 0;

        if (
          !Number.isFinite(
            destinationAverageCost,
          )
        ) {
          throw new BadRequestException(
            'Destination branch average cost is invalid',
          );
        }

        /*
         * --------------------------------------------------
         * NUEVOS STOCKS
         * --------------------------------------------------
         */

        const newSourceStock =
          sourceCurrentStock -
          quantity;

        const newDestinationStock =
          destinationCurrentStock +
          quantity;

        /*
         * --------------------------------------------------
         * VALIDAR STOCK FINAL
         * --------------------------------------------------
         */

        if (
          newSourceStock < 0
        ) {
          throw new BadRequestException(
            'Source branch stock cannot be negative',
          );
        }

        if (
          newDestinationStock < 0
        ) {
          throw new BadRequestException(
            'Destination branch stock cannot be negative',
          );
        }

        /*
         * --------------------------------------------------
         * NUEVO COSTO PROMEDIO DESTINO
         * --------------------------------------------------
         */

        const newDestinationAverageCost =
          destinationCurrentStock <= 0
            ? sourceAverageCost
            : (
                (
                  destinationCurrentStock *
                  destinationAverageCost
                ) +
                (
                  quantity *
                  sourceAverageCost
                )
              ) /
              (
                destinationCurrentStock +
                quantity
              );

        /*
         * --------------------------------------------------
         * ACTUALIZAR STOCK ORIGEN
         * --------------------------------------------------
         */

        await tx.branchProductStock.upsert({
          where: {
            branchId_productId: {
              branchId:
                createDto.sourceBranchId,

              productId:
                createDto.productId,
            },
          },

          create: {
            branchId:
              createDto.sourceBranchId,

            productId:
              createDto.productId,

            stock:
              newSourceStock,

            averageCost:
              sourceAverageCost,
          },

          update: {
            stock:
              newSourceStock,

            averageCost:
              sourceAverageCost,
          },
        });

        /*
         * --------------------------------------------------
         * ACTUALIZAR STOCK DESTINO
         * --------------------------------------------------
         */

        await tx.branchProductStock.upsert({
          where: {
            branchId_productId: {
              branchId:
                createDto.destinationBranchId,

              productId:
                createDto.productId,
            },
          },

          create: {
            branchId:
              createDto.destinationBranchId,

            productId:
              createDto.productId,

            stock:
              newDestinationStock,

            averageCost:
              newDestinationAverageCost,
          },

          update: {
            stock:
              newDestinationStock,

            averageCost:
              newDestinationAverageCost,
          },
        });

        /*
         * --------------------------------------------------
         * COSTO TOTAL DE LA TRANSFERENCIA
         * --------------------------------------------------
         */

        const totalCost =
          quantity *
          sourceAverageCost;

        /*
         * --------------------------------------------------
         * CREAR TRANSFERENCIA
         * --------------------------------------------------
         */

        const transfer =
          await tx.inventoryTransfer.create({
            data: {
              organizationId:
                createDto.organizationId,

              productId:
                createDto.productId,

              sourceBranchId:
                createDto.sourceBranchId,

              destinationBranchId:
                createDto.destinationBranchId,

              quantity,

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
                },
              },

              sourceBranch: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },

              destinationBranch: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          });

        /*
         * --------------------------------------------------
         * MOVIMIENTO TRANSFER_OUT
         * --------------------------------------------------
         */

        await tx.inventoryMovement.create({
          data: {
            organizationId:
              createDto.organizationId,

            productId:
              createDto.productId,

            branchId:
              createDto.sourceBranchId,

            movementType:
              InventoryMovementType.TRANSFER_OUT,

            quantity,

            unitCost:
              sourceAverageCost,

            totalCost:
              totalCost,

            reference:
              createDto.reference,

            notes:
              createDto.notes ??
              `Transfer to ${destinationBranch.name}`,
          },
        });

        /*
         * --------------------------------------------------
         * MOVIMIENTO TRANSFER_IN
         * --------------------------------------------------
         */

        await tx.inventoryMovement.create({
          data: {
            organizationId:
              createDto.organizationId,

            productId:
              createDto.productId,

            branchId:
              createDto.destinationBranchId,

            movementType:
              InventoryMovementType.TRANSFER_IN,

            quantity,

            unitCost:
              sourceAverageCost,

            totalCost:
              totalCost,

            reference:
              createDto.reference,

            notes:
              createDto.notes ??
              `Transfer from ${sourceBranch.name}`,
          },
        });

        /*
         * --------------------------------------------------
         * RETORNAR TRANSFERENCIA
         * --------------------------------------------------
         */

        return transfer;
      },
    );
  }

  async findAll() {
    return this.prisma.inventoryTransfer.findMany({
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

        sourceBranch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        destinationBranch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }

  async findOne(
    id: string,
  ) {
    const transfer =
      await this.prisma.inventoryTransfer.findUnique({
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

          sourceBranch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },

          destinationBranch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

    if (!transfer) {
      throw new NotFoundException(
        'Inventory transfer not found',
      );
    }

    return transfer;
  }
}
