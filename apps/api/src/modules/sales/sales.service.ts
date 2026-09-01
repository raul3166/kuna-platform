import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ============================================================
  // CREAR VENTA
  // ============================================================

  async create(createSaleDto: CreateSaleDto) {
    const {
      organizationId,
      branchId,
      customerId,
      notes,
    } = createSaleDto;

    /*
     * ----------------------------------------------------------
     * VALIDAR ORGANIZACIÓN
     * ----------------------------------------------------------
     */

    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id: organizationId,
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
     * ----------------------------------------------------------
     * VALIDAR SUCURSAL
     * ----------------------------------------------------------
     */

    const branch =
      await this.prisma.branch.findFirst({
        where: {
          id: branchId,
          organizationId,
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
     * ----------------------------------------------------------
     * VALIDAR CLIENTE
     * ----------------------------------------------------------
     */

    if (customerId) {
      const customer =
        await this.prisma.customer.findFirst({
          where: {
            id: customerId,
            organizationId,
          },
        });

      if (!customer) {
        throw new NotFoundException(
          'Customer not found in organization',
        );
      }
    }

    /*
     * ----------------------------------------------------------
     * CREAR DOCUMENTO Y CONSECUTIVO FISCAL
     * ----------------------------------------------------------
     *
     * IMPORTANTE:
     * La resolución se consulta dentro de la transacción.
     *
     * Esto mantiene el avance del consecutivo ligado a la
     * creación de la venta.
     */

    return this.prisma.$transaction(
      async (tx) => {
        const resolution =
          await tx.billingResolution.findFirst({
            where: {
              branchId,
              organizationId,
              isActive: true,
            },
          });

        if (!resolution) {
          throw new ConflictException(
            'No active billing resolution found for this branch. Cannot issue sales.',
          );
        }

        if (
          resolution.currentNumber >
          resolution.toNumber
        ) {
          throw new ConflictException(
            'The billing resolution has run out of authorized invoice numbers.',
          );
        }

        if (
          new Date() >
          new Date(resolution.expiryDate)
        ) {
          throw new ConflictException(
            'The branch billing resolution has expired.',
          );
        }

        const assignedSaleNumber =
          `${resolution.prefix}-${resolution.currentNumber}`;

        /*
         * Avanzar consecutivo
         */

        await tx.billingResolution.update({
          where: {
            id: resolution.id,
          },
          data: {
            currentNumber: {
              increment: 1,
            },
          },
        });

        /*
         * Crear cabecera
         */

        return tx.sale.create({
          data: {
            organizationId,
            branchId,
            customerId,
            saleNumber:
              assignedSaleNumber,
            notes,

            subtotal: 0,
            discount: 0,
            tax: 0,
            total: 0,
          },

          include: {
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },

            customer: true,

            items: {
              include: {
                product: true,
              },
            },
          },
        });
      },
    );
  }

  // ============================================================
  // LISTAR VENTAS
  // ============================================================

  async findAll(
    organizationId?: string,
    status?: string,
  ) {
    return this.prisma.sale.findMany({
      where: {
        ...(organizationId
          ? { organizationId }
          : {}),

        ...(status
          ? { status: status as any }
          : {}),
      },

      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        customer: true,

        items: {
          include: {
            product: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // ============================================================
  // CONSULTAR UNA VENTA
  // ============================================================

  async findOne(id: string) {
    const sale =
      await this.prisma.sale.findUnique({
        where: {
          id,
        },

        include: {
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },

          customer: true,

          items: {
            include: {
              product: true,
            },
          },
        },
      });

    if (!sale) {
      throw new NotFoundException(
        'Sale record not found',
      );
    }

    return sale;
  }

  // ============================================================
  // ACTUALIZAR VENTA
  // ============================================================

  async update(
    id: string,
    updateSaleDto: UpdateSaleDto,
  ) {
    const sale =
      await this.prisma.sale.findUnique({
        where: {
          id,
        },
      });

    if (!sale) {
      throw new NotFoundException(
        'Sale not found',
      );
    }

    if (sale.status !== 'DRAFT') {
      throw new ConflictException(
        'Only DRAFT sales can be modified',
      );
    }

    /*
     * Validar sucursal
     */

    if (updateSaleDto.branchId) {
      const branch =
        await this.prisma.branch.findFirst({
          where: {
            id: updateSaleDto.branchId,
            organizationId:
              sale.organizationId,
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
    }

    /*
     * Validar cliente
     */

    if (updateSaleDto.customerId) {
      const customer =
        await this.prisma.customer.findFirst({
          where: {
            id: updateSaleDto.customerId,
            organizationId:
              sale.organizationId,
          },
        });

      if (!customer) {
        throw new NotFoundException(
          'Customer not found in organization',
        );
      }
    }

    /*
     * Validar número de venta
     */

    if (
      updateSaleDto.saleNumber &&
      updateSaleDto.saleNumber !==
        sale.saleNumber
    ) {
      const existingSale =
        await this.prisma.sale.findFirst({
          where: {
            organizationId:
              sale.organizationId,

            saleNumber:
              updateSaleDto.saleNumber,

            NOT: {
              id,
            },
          },
        });

      if (existingSale) {
        throw new ConflictException(
          'Sale number already exists in organization',
        );
      }
    }

    return this.prisma.sale.update({
      where: {
        id,
      },

      data: updateSaleDto,

      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },

        customer: true,

        items: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  // ============================================================
  // ELIMINAR VENTA
  // ============================================================

  async remove(id: string) {
    const sale =
      await this.prisma.sale.findUnique({
        where: {
          id,
        },
      });

    if (!sale) {
      throw new NotFoundException(
        'Sale not found',
      );
    }

    if (sale.status !== 'DRAFT') {
      throw new ConflictException(
        'Only DRAFT sales can be deleted',
      );
    }

    return this.prisma.sale.delete({
      where: {
        id,
      },
    });
  }

  // ============================================================
  // RECALCULAR TOTALES
  // ============================================================

  async recalculateSaleTotals(
    saleId: string,
  ) {
    const sale =
      await this.prisma.sale.findUnique({
        where: {
          id: saleId,
        },
      });

    if (!sale) {
      throw new NotFoundException(
        'Sale not found',
      );
    }

    const items =
      await this.prisma.saleItem.findMany({
        where: {
          saleId,
        },
      });

    const subtotalBase =
      items.reduce(
        (acc, item) =>
          acc +
          item.quantity *
            Number(item.unitPrice),
        0,
      );

    const totalDiscount =
      items.reduce(
        (acc, item) =>
          acc + Number(item.discount),
        0,
      );

    const totalNeto =
      subtotalBase - totalDiscount;

    return this.prisma.sale.update({
      where: {
        id: saleId,
      },

      data: {
        subtotal: subtotalBase,
        discount: totalDiscount,
        total: totalNeto,
      },
    });
  }

  // ============================================================
  // CONFIRMAR VENTA
  // ============================================================

  async confirm(id: string) {
    const sale =
      await this.prisma.sale.findUnique({
        where: {
          id,
        },

        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

    if (!sale) {
      throw new NotFoundException(
        'Sale not found',
      );
    }

    if (sale.status !== 'DRAFT') {
      throw new ConflictException(
        'Only DRAFT sales can be confirmed',
      );
    }

    if (
      !sale.items ||
      sale.items.length === 0
    ) {
      throw new ConflictException(
        'Cannot confirm a sale with empty items',
      );
    }

    /*
     * Confirmación + inventario + kardex
     * deben ser UNA sola operación.
     */

    return this.prisma.$transaction(
      async (tx) => {
        /*
         * ------------------------------------------------------
         * PROCESAR CADA PRODUCTO
         * ------------------------------------------------------
         */

        for (const item of sale.items) {
          const quantity =
            Number(item.quantity);

          if (
            !Number.isFinite(quantity) ||
            quantity <= 0
          ) {
            throw new ConflictException(
              `Invalid quantity for product [${item.product.name}]`,
            );
          }

          /*
           * Buscar stock de la sucursal
           */

          const stockRecord =
            await tx.branchProductStock.findUnique({
              where: {
                branchId_productId: {
                  branchId:
                    sale.branchId,

                  productId:
                    item.productId,
                },
              },
            });

          if (!stockRecord) {
            throw new ConflictException(
              `No inventory record found for product [${item.product.name}] in this branch`,
            );
          }

          const currentStock =
            Number(stockRecord.stock);

          if (
            !Number.isFinite(currentStock)
          ) {
            throw new ConflictException(
              `Invalid stock for product [${item.product.name}]`,
            );
          }

          if (
            currentStock < quantity
          ) {
            throw new ConflictException(
              `Insufficient stock for product [${item.product.name}]. Available: ${currentStock}, Required: ${quantity}`,
            );
          }

          /*
           * Descontar sucursal
           */

          await tx.branchProductStock.update({
            where: {
              id: stockRecord.id,
            },

            data: {
              stock: {
                decrement: quantity,
              },
            },
          });

          /*
           * Descontar stock global
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

          const globalStock =
            Number(product.stock);

          if (
            globalStock < quantity
          ) {
            throw new ConflictException(
              `Insufficient global stock for product [${product.name}]`,
            );
          }

          await tx.product.update({
            where: {
              id: item.productId,
            },

            data: {
              stock: {
                decrement: quantity,
              },
            },
          });

          /*
           * Kardex
           *
           * SALE se guarda positivo.
           * InventoryMovementsService interpreta
           * SALE como salida.
           */

          await tx.inventoryMovement.create({
            data: {
              organizationId:
                sale.organizationId,

              branchId:
                sale.branchId,

              productId:
                item.productId,

              movementType:
                'SALE',

              quantity,

              unitCost:
                Number(
                  stockRecord.averageCost,
                ),

              totalCost:
                quantity *
                Number(
                  stockRecord.averageCost,
                ),

              reference:
                `VENTA-${sale.saleNumber}`,

              notes:
                item.description ||
                'Salida automática por concepto de venta POS.',
            },
          });
        }

        /*
         * ------------------------------------------------------
         * SELLAR VENTA
         * ------------------------------------------------------
         */

        return tx.sale.update({
          where: {
            id,
          },

          data: {
            status: 'CONFIRMED',
          },

          include: {
            branch: true,
            customer: true,

            items: {
              include: {
                product: true,
              },
            },
          },
        });
      },
    );
  }

  // ============================================================
  // CANCELAR VENTA
  // ============================================================

  async cancel(id: string) {
    const sale =
      await this.prisma.sale.findUnique({
        where: {
          id,
        },
      });

    if (!sale) {
      throw new NotFoundException(
        'Sale not found',
      );
    }

    if (sale.status !== 'DRAFT') {
      throw new ConflictException(
        'Only DRAFT sales can be cancelled',
      );
    }

    return this.prisma.sale.update({
      where: {
        id,
      },

      data: {
        status: 'CANCELLED',
      },
    });
  }
}
