import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateBakeryRecipeDto } from './dto/create-bakery-recipe.dto';
import {
  CreateBakeryProductionOrderDto,
  UpdateBakeryConfigDto,
  UpdateBakeryProductionStatusDto,
} from './dto/bakery-production.dto';
import { BakeryProductionStatus, Prisma } from '@prisma/client';

@Injectable()
export class BakeryService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveOrganizationId(
    organizationId?: string,
    userId?: string,
  ): Promise<string> {
    if (organizationId && organizationId.trim() !== '') {
      return organizationId;
    }

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });
      if (user?.organizationId) {
        return user.organizationId;
      }
    }

    const fallbackOrg = await this.prisma.organization.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!fallbackOrg) {
      throw new BadRequestException(
        'No se encontró una organización activa para operar el módulo de Panadería.',
      );
    }

    return fallbackOrg.id;
  }

  private async resolveBranchId(
    organizationId: string,
    branchId?: string,
  ): Promise<string> {
    if (branchId && branchId.trim() !== '') {
      return branchId;
    }

    const branch = await this.prisma.branch.findFirst({
      where: { organizationId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!branch) {
      throw new BadRequestException(
        'No se encontró una sucursal activa para registrar la producción de panadería.',
      );
    }

    return branch.id;
  }

  async getDashboard(
    organizationId?: string,
    branchId?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(23, 59, 59, 999);

    const branchFilter = branchId ? { branchId } : {};

    const [
      activeRecipesCount,
      allActiveOrders,
      completedTodayOrders,
      recentCompletedOrders,
      expiringLots,
    ] = await Promise.all([
      this.prisma.bakeryRecipe.count({
        where: { organizationId: orgId, isActive: true },
      }),
      this.prisma.bakeryProductionOrder.findMany({
        where: {
          organizationId: orgId,
          ...branchFilter,
          status: {
            in: [
              BakeryProductionStatus.PLANNED,
              BakeryProductionStatus.MIXING,
              BakeryProductionStatus.FERMENTING,
              BakeryProductionStatus.BAKING,
              BakeryProductionStatus.COOLING_DECORATING,
            ],
          },
        },
        include: {
          recipe: true,
          finishedProduct: true,
          bakerWorker: true,
          branch: true,
        },
        orderBy: { scheduledAt: 'asc' },
      }),
      this.prisma.bakeryProductionOrder.findMany({
        where: {
          organizationId: orgId,
          ...branchFilter,
          status: BakeryProductionStatus.COMPLETED,
          completedAt: { gte: startOfDay },
        },
      }),
      this.prisma.bakeryProductionOrder.findMany({
        where: {
          organizationId: orgId,
          ...branchFilter,
          status: BakeryProductionStatus.COMPLETED,
        },
        include: {
          recipe: true,
          finishedProduct: true,
          bakerWorker: true,
          branch: true,
        },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
      this.prisma.productLot.findMany({
        where: {
          product: { organizationId: orgId },
          ...(branchId ? { branchId } : {}),
          stock: { gt: 0 },
          expirationDate: { lte: threeDaysFromNow },
        },
        include: {
          product: true,
          branch: true,
        },
        orderBy: { expirationDate: 'asc' },
        take: 10,
      }),
    ]);

    const batchesInProcess = allActiveOrders.filter(
      (o) => o.status !== BakeryProductionStatus.PLANNED,
    ).length;

    const unitsBakedToday = completedTodayOrders.reduce(
      (sum, o) => sum + Number(o.actualQuantity ?? o.plannedQuantity ?? 0),
      0,
    );

    const wasteUnitsToday = completedTodayOrders.reduce(
      (sum, o) => sum + Number(o.wasteQuantity ?? 0),
      0,
    );

    const productionCostToday = completedTodayOrders.reduce(
      (sum, o) => sum + Number(o.totalIngredientsCost ?? 0),
      0,
    );

    const kanban = {
      PLANNED: allActiveOrders.filter(
        (o) => o.status === BakeryProductionStatus.PLANNED,
      ),
      MIXING: allActiveOrders.filter(
        (o) => o.status === BakeryProductionStatus.MIXING,
      ),
      FERMENTING: allActiveOrders.filter(
        (o) => o.status === BakeryProductionStatus.FERMENTING,
      ),
      BAKING: allActiveOrders.filter(
        (o) => o.status === BakeryProductionStatus.BAKING,
      ),
      COOLING_DECORATING: allActiveOrders.filter(
        (o) => o.status === BakeryProductionStatus.COOLING_DECORATING,
      ),
      COMPLETED: recentCompletedOrders,
    };

    return {
      kpis: {
        activeRecipesCount,
        plannedBatchesCount: kanban.PLANNED.length,
        batchesInProcess,
        unitsBakedToday,
        wasteUnitsToday,
        productionCostToday,
        expiringLotsCount: expiringLots.length,
      },
      kanban,
      expiringLots,
    };
  }

  async findAllRecipes(
    organizationId?: string,
    search?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const where: Prisma.BakeryRecipeWhereInput = {
      organizationId: orgId,
    };

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
        {
          finishedProduct: {
            name: { contains: q, mode: 'insensitive' },
          },
        },
      ];
    }

    return this.prisma.bakeryRecipe.findMany({
      where,
      include: {
        finishedProduct: true,
        ingredients: {
          include: {
            ingredientProduct: true,
          },
        },
        _count: {
          select: { productionOrders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRecipeById(id: string, organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const recipe = await this.prisma.bakeryRecipe.findFirst({
      where: { id, organizationId: orgId },
      include: {
        finishedProduct: true,
        ingredients: {
          include: {
            ingredientProduct: true,
          },
        },
        productionOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            bakerWorker: true,
            branch: true,
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException('Receta de panadería no encontrada.');
    }

    return recipe;
  }

  async createRecipe(dto: CreateBakeryRecipeDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    if (!dto.ingredients || dto.ingredients.length === 0) {
      throw new BadRequestException(
        'La receta debe incluir al menos un ingrediente o insumo.',
      );
    }

    const finishedProduct = await this.prisma.product.findFirst({
      where: { id: dto.finishedProductId, organizationId: orgId },
    });

    if (!finishedProduct) {
      throw new NotFoundException(
        'El producto terminado seleccionado no existe en el catálogo.',
      );
    }

    const ingredientIds = dto.ingredients.map((i) => i.ingredientProductId);
    const ingredientProducts = await this.prisma.product.findMany({
      where: {
        id: { in: ingredientIds },
        organizationId: orgId,
      },
    });

    const productMap = new Map(ingredientProducts.map((p) => [p.id, p]));

    let estimatedBatchCost = 0;
    for (const item of dto.ingredients) {
      const prod = productMap.get(item.ingredientProductId);
      if (!prod) {
        throw new BadRequestException(
          `El ingrediente con ID ${item.ingredientProductId} no pertenece a la organización.`,
        );
      }
      estimatedBatchCost += Number(prod.costPrice ?? 0) * Number(item.quantity);
    }

    const yieldQty = Number(dto.yieldQuantity) > 0 ? Number(dto.yieldQuantity) : 1;
    const estimatedUnitCost = estimatedBatchCost / yieldQty;

    const code =
      dto.code?.trim() ||
      `REC-${Math.floor(1000 + Math.random() * 9000)}`;

    return this.prisma.bakeryRecipe.create({
      data: {
        organizationId: orgId,
        finishedProductId: dto.finishedProductId,
        name: dto.name.trim(),
        code,
        yieldQuantity: yieldQty,
        yieldUnit: dto.yieldUnit || 'UND',
        prepMinutes: dto.prepMinutes ?? 45,
        bakeMinutes: dto.bakeMinutes ?? 25,
        ovenTempC: dto.ovenTempC ?? 180,
        shelfLifeDays: dto.shelfLifeDays ?? 3,
        estimatedBatchCost,
        estimatedUnitCost,
        instructions: dto.instructions,
        ingredients: {
          create: dto.ingredients.map((ing) => ({
            ingredientProductId: ing.ingredientProductId,
            quantity: ing.quantity,
            unit: ing.unit || 'KG',
            notes: ing.notes,
          })),
        },
      },
      include: {
        finishedProduct: true,
        ingredients: {
          include: {
            ingredientProduct: true,
          },
        },
      },
    });
  }

  async findAllProductionOrders(
    organizationId?: string,
    branchId?: string,
    status?: string,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const where: Prisma.BakeryProductionOrderWhereInput = {
      organizationId: orgId,
      ...(branchId ? { branchId } : {}),
      ...(status ? { status: status as BakeryProductionStatus } : {}),
    };

    return this.prisma.bakeryProductionOrder.findMany({
      where,
      include: {
        recipe: {
          include: {
            ingredients: {
              include: { ingredientProduct: true },
            },
          },
        },
        finishedProduct: true,
        bakerWorker: true,
        branch: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createProductionOrder(
    dto: CreateBakeryProductionOrderDto,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);
    const branchId = await this.resolveBranchId(orgId, dto.branchId);

    const recipe = await this.prisma.bakeryRecipe.findFirst({
      where: { id: dto.recipeId, organizationId: orgId },
      include: {
        ingredients: {
          include: { ingredientProduct: true },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(
        'La receta seleccionada para hornear no existe.',
      );
    }

    const multiplier =
      dto.batchesMultiplier && dto.batchesMultiplier > 0
        ? Number(dto.batchesMultiplier)
        : 1;

    // Recalculate current ingredient cost based on live Product.costPrice
    const liveBatchCost = recipe.ingredients.reduce(
      (sum, ing) =>
        sum +
        Number(ing.quantity) * Number(ing.ingredientProduct?.costPrice ?? 0),
      0,
    );

    const baseBatchCost =
      liveBatchCost > 0 ? liveBatchCost : Number(recipe.estimatedBatchCost);
    const plannedQuantity = Number(recipe.yieldQuantity) * multiplier;
    const totalIngredientsCost = baseBatchCost * multiplier;
    const unitProductionCost =
      plannedQuantity > 0 ? totalIngredientsCost / plannedQuantity : 0;

    const batchNumber = `HOR-${Date.now().toString().slice(-6)}`;

    return this.prisma.bakeryProductionOrder.create({
      data: {
        organizationId: orgId,
        branchId,
        recipeId: recipe.id,
        finishedProductId: recipe.finishedProductId,
        bakerWorkerId: dto.bakerWorkerId || null,
        batchNumber,
        status: BakeryProductionStatus.PLANNED,
        batchesMultiplier: multiplier,
        plannedQuantity,
        totalIngredientsCost,
        unitProductionCost,
        ovenNumber: dto.ovenNumber || 'Horno Principal #1',
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : new Date(),
        notes: dto.notes,
      },
      include: {
        recipe: true,
        finishedProduct: true,
        bakerWorker: true,
        branch: true,
      },
    });
  }

  async updateProductionStatus(
    id: string,
    dto: UpdateBakeryProductionStatusDto,
    userId?: string,
  ) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const order = await this.prisma.bakeryProductionOrder.findFirst({
      where: { id, organizationId: orgId },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: {
                ingredientProduct: true,
              },
            },
          },
        },
        finishedProduct: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Orden de producción no encontrada.');
    }

    if (
      order.status === BakeryProductionStatus.COMPLETED &&
      dto.status === BakeryProductionStatus.COMPLETED
    ) {
      return order;
    }

    const isStartingProcess =
      !order.startedAt &&
      (dto.status === BakeryProductionStatus.MIXING ||
        dto.status === BakeryProductionStatus.FERMENTING ||
        dto.status === BakeryProductionStatus.BAKING);

    // If transitioning to COMPLETED for the first time, deduct raw ingredients, increment finished product stock, and create fresh ProductLot
    if (
      dto.status === BakeryProductionStatus.COMPLETED &&
      order.status !== BakeryProductionStatus.COMPLETED
    ) {
      const wasteQty =
        dto.wasteQuantity !== undefined
          ? Number(dto.wasteQuantity)
          : Number(order.wasteQuantity ?? 0);

      const actualQty =
        dto.actualQuantity !== undefined
          ? Number(dto.actualQuantity)
          : Math.max(0, Number(order.plannedQuantity) - wasteQty);

      const unitCost =
        actualQty > 0
          ? Number(order.totalIngredientsCost) / actualQty
          : Number(order.unitProductionCost);

      const multiplier = Number(order.batchesMultiplier ?? 1);

      return this.prisma.$transaction(async (tx) => {
        // 1. Deduct each raw ingredient from Product and BranchProductStock + record InventoryMovement
        for (const ing of order.recipe.ingredients) {
          const consumedQty = Number(ing.quantity) * multiplier;
          if (consumedQty <= 0) continue;

          const ingCost = Number(ing.ingredientProduct?.costPrice ?? 0);

          await tx.product.update({
            where: { id: ing.ingredientProductId },
            data: {
              stock: { decrement: consumedQty },
            },
          });

          await tx.branchProductStock.upsert({
            where: {
              branchId_productId: {
                branchId: order.branchId,
                productId: ing.ingredientProductId,
              },
            },
            update: {
              stock: { decrement: consumedQty },
            },
            create: {
              branchId: order.branchId,
              productId: ing.ingredientProductId,
              stock: -consumedQty,
              averageCost: ingCost,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              organizationId: orgId,
              branchId: order.branchId,
              productId: ing.ingredientProductId,
              movementType: 'SERVICE_CONSUMPTION',
              quantity: consumedQty,
              unitCost: ingCost,
              totalCost: consumedQty * ingCost,
              reference: order.batchNumber,
              notes: `Consumo de insumo en tanda de panadería ${order.batchNumber} (${order.recipe.name})`,
            },
          });
        }

        // 2. Increment finished product stock + update costPrice + record InventoryMovement + create fresh ProductLot
        if (actualQty > 0) {
          await tx.product.update({
            where: { id: order.finishedProductId },
            data: {
              stock: { increment: actualQty },
              ...(unitCost > 0 ? { costPrice: unitCost } : {}),
            },
          });

          await tx.branchProductStock.upsert({
            where: {
              branchId_productId: {
                branchId: order.branchId,
                productId: order.finishedProductId,
              },
            },
            update: {
              stock: { increment: actualQty },
              ...(unitCost > 0 ? { averageCost: unitCost } : {}),
            },
            create: {
              branchId: order.branchId,
              productId: order.finishedProductId,
              stock: actualQty,
              averageCost: unitCost,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              organizationId: orgId,
              branchId: order.branchId,
              productId: order.finishedProductId,
              movementType: 'ADJUSTMENT',
              quantity: actualQty,
              unitCost,
              totalCost: Number(order.totalIngredientsCost),
              reference: order.batchNumber,
              notes: `Ingreso de producto horneado fresco (${order.batchNumber}) - Merma: ${wasteQty}`,
            },
          });

          // 3. Create / Upsert Fresh ProductLot with shelf-life expiration date (FEFO)
          const shelfLifeDays = Number(order.recipe.shelfLifeDays ?? 3);
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + shelfLifeDays);

          await tx.productLot.upsert({
            where: {
              productId_branchId_lotNumber: {
                productId: order.finishedProductId,
                branchId: order.branchId,
                lotNumber: order.batchNumber,
              },
            },
            update: {
              stock: { increment: actualQty },
              expirationDate,
            },
            create: {
              productId: order.finishedProductId,
              branchId: order.branchId,
              lotNumber: order.batchNumber,
              expirationDate,
              stock: actualQty,
            },
          });
        }

        // 4. Mark production order as COMPLETED
        return tx.bakeryProductionOrder.update({
          where: { id: order.id },
          data: {
            status: BakeryProductionStatus.COMPLETED,
            startedAt: order.startedAt ?? new Date(),
            completedAt: new Date(),
            actualQuantity: actualQty,
            wasteQuantity: wasteQty,
            wasteReason: dto.wasteReason ?? order.wasteReason,
            unitProductionCost: unitCost,
            ovenNumber: dto.ovenNumber ?? order.ovenNumber,
            notes: dto.notes ?? order.notes,
          },
          include: {
            recipe: true,
            finishedProduct: true,
            bakerWorker: true,
            branch: true,
          },
        });
      });
    }

    // Standard stage transition (PLANNED -> MIXING -> FERMENTING -> BAKING -> COOLING_DECORATING / CANCELLED)
    return this.prisma.bakeryProductionOrder.update({
      where: { id: order.id },
      data: {
        status: dto.status,
        ...(isStartingProcess ? { startedAt: new Date() } : {}),
        ...(dto.ovenNumber ? { ovenNumber: dto.ovenNumber } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.wasteQuantity !== undefined
          ? { wasteQuantity: dto.wasteQuantity }
          : {}),
        ...(dto.wasteReason !== undefined
          ? { wasteReason: dto.wasteReason }
          : {}),
      },
      include: {
        recipe: true,
        finishedProduct: true,
        bakerWorker: true,
        branch: true,
      },
    });
  }

  async getConfig(organizationId?: string, userId?: string) {
    const orgId = await this.resolveOrganizationId(organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'BAKERY' },
    });

    if (!vertical) {
      throw new NotFoundException(
        'El vertical BAKERY no está registrado en el catálogo maestro.',
      );
    }

    const orgVertical = await this.prisma.organizationVertical.findUnique({
      where: {
        organizationId_verticalId: {
          organizationId: orgId,
          verticalId: vertical.id,
        },
      },
    });

    const defaultConfig = {
      defaultShelfLifeDays: 3,
      autoCreateProductLotOnBake: true,
      autoDeductIngredientsOnBake: true,
      maxWasteAlertPct: 5,
    };

    return {
      organizationId: orgId,
      verticalCode: 'BAKERY',
      isActive: orgVertical?.isActive ?? false,
      config: {
        ...defaultConfig,
        ...((orgVertical?.config as Record<string, any>) || {}),
      },
    };
  }

  async updateConfig(dto: UpdateBakeryConfigDto, userId?: string) {
    const orgId = await this.resolveOrganizationId(dto.organizationId, userId);

    const vertical = await this.prisma.vertical.findUnique({
      where: { code: 'BAKERY' },
    });

    if (!vertical) {
      throw new NotFoundException(
        'El vertical BAKERY no está registrado en el catálogo maestro.',
      );
    }

    const current = await this.getConfig(orgId, userId);
    const { organizationId: _ignore, ...configUpdates } = dto;
    const mergedConfig = {
      ...current.config,
      ...configUpdates,
    };

    const updated = await this.prisma.organizationVertical.upsert({
      where: {
        organizationId_verticalId: {
          organizationId: orgId,
          verticalId: vertical.id,
        },
      },
      update: {
        config: mergedConfig,
      },
      create: {
        organizationId: orgId,
        verticalId: vertical.id,
        isActive: true,
        config: mergedConfig,
      },
    });

    return {
      organizationId: orgId,
      verticalCode: 'BAKERY',
      isActive: updated.isActive,
      config: updated.config,
    };
  }
}
