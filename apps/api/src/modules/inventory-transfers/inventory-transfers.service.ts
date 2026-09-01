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

  // ============================================================
  // CREAR TRANSFERENCIA
  // ============================================================

  async create(
    createDto: CreateInventoryTransferDto,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        // ------------------------------------------------------
        // VALIDAR ORGANIZACIÓN
        // ------------------------------------------------------

        const organization =
          await tx.organization.findUnique({
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

        // ------------------------------------------------------
        // VALIDAR PRODUCTO
        // ------------------------------------------------------

        const product =
          await tx.product.findUnique({
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

        // ------------------------------------------------------
        // VALIDAR SUCURSAL ORIGEN
        // ------------------------------------------------------

        const sourceBranch =
          await tx.branch.findUnique({
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

        // ------------------------------------------------------
        // VALIDAR SUCURSAL DESTINO
        // ------------------------------------------------------

        const destinationBranch =
          await tx.branch.findUnique({
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

        // ------------------------------------------------------
        // SUCURSALES DIFERENTES
        // ------------------------------------------------------

        if (
          createDto.sourceBranchId ===
          createDto.destinationBranchId
        ) {
          throw new ConflictException(
            'Source and destination branches must be different',
          );
        }

        // ------------------------------------------------------
        // VALIDAR CANTIDAD
        // ------------------------------------------------------

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

        // ======================================================
        // STOCK ORIGEN
        // ======================================================

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

        const sourceAverageCost =
          sourceStock
            ? Number(
                sourceStock.averageCost,
              )
            : Number(
                product.costPrice,
              );

        if (
          !Number.isFinite(
            sourceAverageCost,
          )
        ) {
          throw new BadRequestException(
            'Source branch average cost is invalid',
          );
        }

        // ------------------------------------------------------
        // STOCK SUFICIENTE
        // ------------------------------------------------------

        if (
          quantity >
          sourceCurrentStock
        ) {
          throw new ConflictException(
            'Insufficient stock in source branch',
          );
        }

        // ======================================================
        // STOCK DESTINO
        // ======================================================

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

        // ======================================================
        // NUEVOS STOCKS
        // ======================================================

        const newSourceStock =
          sourceCurrentStock -
          quantity;

        const newDestinationStock =
          destinationCurrentStock +
          quantity;

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

        // ======================================================
        // COSTO PROMEDIO DESTINO
        // ======================================================

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

        // ======================================================
        // ACTUALIZAR ORIGEN
        // ======================================================

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

            /*
             * La transferencia no modifica
             * el costo promedio del origen.
             */

            averageCost:
              sourceAverageCost,
          },
        });

        // ======================================================
        // ACTUALIZAR DESTINO
        // ======================================================

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

        // ======================================================
        // IMPORTANTE:
        //
        // NO ACTUALIZAMOS product.stock.
        //
        // Ejemplo:
        //
        // Norte: 100 -> 70
        // Centro: 50  -> 80
        //
        // Global antes: 150
        // Global después: 150
        //
        // Por lo tanto:
        //
        // Product.stock permanece igual.
        // ======================================================

        const totalCost =
          quantity *
          sourceAverageCost;

        // ======================================================
        // CREAR INVENTORY TRANSFER
        // ======================================================

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
                  stock: true,
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

        // ======================================================
        // KARDEX - TRANSFER OUT
        // ======================================================

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

            /*
             * Siempre positivo en InventoryMovement.
             * El Kardex interpreta TRANSFER_OUT como salida.
             */

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

        // ======================================================
        // KARDEX - TRANSFER IN
        // ======================================================

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

            /*
             * Siempre positivo.
             * El Kardex interpreta TRANSFER_IN como entrada.
             */

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

        // ======================================================
        // RETORNAR TRANSFERENCIA
        // ======================================================

        return transfer;
      },
    );
  }

  // ============================================================
  // LISTAR TRANSFERENCIAS
  // ============================================================

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
            stock: true,
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

  // ============================================================
  // BUSCAR TRANSFERENCIA
  // ============================================================

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
              stock: true,
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
