import {
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
    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id: createDto.organizationId,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found',
      );
    }

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

    const sourceBranch =
      await this.prisma.branch.findUnique({
        where: {
          id: createDto.sourceBranchId,
        },
      });

    if (!sourceBranch) {
      throw new NotFoundException(
        'Source branch not found',
      );
    }

    const destinationBranch =
      await this.prisma.branch.findUnique({
        where: {
          id: createDto.destinationBranchId,
        },
      });

    if (!destinationBranch) {
      throw new NotFoundException(
        'Destination branch not found',
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

    if (
      destinationBranch.organizationId !==
      createDto.organizationId
    ) {
      throw new ConflictException(
        'Destination branch does not belong to the organization',
      );
    }

    if (
      createDto.sourceBranchId ===
      createDto.destinationBranchId
    ) {
      throw new ConflictException(
        'Source and destination branches must be different',
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
            ? Number(sourceStock.stock)
            : 0;

        /*
         * Costo promedio de la sucursal origen.
         *
         * Este costo acompaña las unidades que
         * estamos transfiriendo.
         */

        const sourceAverageCost =
          sourceStock
            ? Number(
                sourceStock.averageCost,
              )
            : 0;

        /*
         * --------------------------------------------------
         * VALIDAR CANTIDAD
         * --------------------------------------------------
         */

        const quantity =
          Number(createDto.quantity);

        if (
          quantity <= 0
        ) {
          throw new ConflictException(
            'Transfer quantity must be greater than zero',
          );
        }

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
         * NUEVO COSTO PROMEDIO DESTINO
         * --------------------------------------------------
         *
         * Si el destino no tiene stock:
         *
         *   costo destino = costo origen
         *
         * Si ya tiene stock:
         *
         *   (
         *     stockDestino * costoDestino
         *     +
         *     cantidadTransferida * costoOrigen
         *   )
         *   /
         *   stockDestinoNuevo
         *
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
         *
         * Sale de la sucursal origen
         * utilizando su costo promedio.
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
         *
         * Entra a la sucursal destino
         * con el mismo costo de origen.
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

  async findOne(id: string) {
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
