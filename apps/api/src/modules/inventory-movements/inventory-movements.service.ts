import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InventoryMovementType,
} from '@prisma/client';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';

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

      const currentStock =
        Number(product.stock);

      const quantity =
        Number(createDto.quantity);

      let newStock = currentStock;

      if (quantity <= 0) {
  throw new BadRequestException(
    'Quantity must be greater than zero',
  );
}
switch (createDto.movementType) {
  case InventoryMovementType.INITIAL_STOCK:
    if (currentStock > 0) {
    throw new BadRequestException(
      'Initial stock has already been defined',
    );
  }
    newStock = quantity;
    break;

  case InventoryMovementType.PURCHASE:
    if (!createDto.unitCost) {
    throw new BadRequestException(
      'Unit cost is required for purchases',
    );
  }
    newStock = currentStock + quantity;
    break;

  case InventoryMovementType.SALE:
    if (quantity > currentStock) {
      throw new BadRequestException(
        'Insufficient stock',
      );
    }

    newStock = currentStock - quantity;
    break;

  case InventoryMovementType.PURCHASE_RETURN:
    if (quantity > currentStock) {
      throw new BadRequestException(
        'Insufficient stock',
      );
    }

    newStock = currentStock - quantity;
    break;

  case InventoryMovementType.SALE_RETURN:
    newStock = currentStock + quantity;
    break;

  case InventoryMovementType.TRANSFER_IN:
    newStock = currentStock + quantity;
    break;

  case InventoryMovementType.TRANSFER_OUT:
    if (quantity > currentStock) {
      throw new BadRequestException(
        'Insufficient stock',
      );
    }

    newStock = currentStock - quantity;
    break;

  case InventoryMovementType.ADJUSTMENT:
    newStock = quantity;
    break;

  default:
  throw new BadRequestException(
    'Invalid movement type',
  );
}

      await tx.product.update({
        where: {
          id: product.id,
        },
        data: {
          stock: newStock,
        },
      });

      return tx.inventoryMovement.create({
        data: {
          organizationId:
            createDto.organizationId,

          productId:
            createDto.productId,

          movementType:
            createDto.movementType,

          quantity:
            createDto.quantity,

          unitCost:
            createDto.unitCost,

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

      orderBy: {
        createdAt: 'asc',
      },
    });

  let balance = 0;

  const kardex = movements.map((movement) => {
    const quantity = Number(movement.quantity);

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
        balance = quantity;
        entry = quantity;
        break;
    }

    return {
      id: movement.id,
      date: movement.createdAt,
      movementType: movement.movementType,
      movementName: this.getMovementName(
        movement.movementType,
      ),
      reference: movement.reference,
      notes: movement.notes,
      unitCost: movement.unitCost
        ? Number(movement.unitCost)
        : null,
      quantity,
      entry,
      exit,
      balance,
    };
  });

  return {
    product: {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      stock: Number(product.stock),
      salePrice: Number(product.salePrice),
      costPrice: Number(product.costPrice),
      categoryId: product.categoryId,
      supplierId: product.supplierId,
    },

    summary: {
      totalMovements: kardex.length,
      currentStock: Number(product.stock),
    },

    movements: kardex,
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
