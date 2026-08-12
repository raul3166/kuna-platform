import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PurchaseOrderStatus,
} from '@prisma/client';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

import {
  purchaseOrderSelect,
} from '../../common/prisma/selects';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}
  async create(
  createPurchaseOrderDto: CreatePurchaseOrderDto,
) {
  const organization =
  await this.prisma.organization.findUnique({
    where: {
      id: createPurchaseOrderDto.organizationId,
    },
  });

if (!organization) {
  throw new NotFoundException(
    'Organization not found',
  );
}
const supplier =
  await this.prisma.supplier.findUnique({
    where: {
      id: createPurchaseOrderDto.supplierId,
    },
  });

if (!supplier) {
  throw new NotFoundException(
    'Supplier not found',
  );
}
const existingPurchaseOrder =
  await this.prisma.purchaseOrder.findFirst({
    where: {
      organizationId:
        createPurchaseOrderDto.organizationId,

      number:
        createPurchaseOrderDto.number,
    },
  });

if (existingPurchaseOrder) {
  throw new ConflictException(
    'A purchase order with this number already exists',
  );
}
return this.prisma.purchaseOrder.create({
  data: {
    ...createPurchaseOrderDto,

    orderDate: new Date(
      createPurchaseOrderDto.orderDate,
    ),

    expectedDate:
      createPurchaseOrderDto.expectedDate
        ? new Date(
            createPurchaseOrderDto.expectedDate,
          )
        : null,

    status:
      PurchaseOrderStatus.DRAFT,

    subtotal: 0,

    tax: 0,

    total: 0,
  },

  select: purchaseOrderSelect,
});
  }

  async findAll() {
  return this.prisma.purchaseOrder.findMany({
    orderBy: {
      createdAt: 'desc',
    },

    select: purchaseOrderSelect,
  });
}

  async findOne(id: string) {
  return this.getPurchaseOrderOrThrow(id);
}

  async update(
  id: string,
  updatePurchaseOrderDto: UpdatePurchaseOrderDto,
) {
  const purchaseOrder =
    await this.getPurchaseOrderOrThrow(id);

  if (purchaseOrder.status !== 'DRAFT') {
    throw new ConflictException(
      'Only draft purchase orders can be modified',
    );
  }

  if (
    updatePurchaseOrderDto.supplierId &&
    updatePurchaseOrderDto.supplierId !==
      purchaseOrder.supplierId
  ) {
    const supplier =
      await this.prisma.supplier.findUnique({
        where: {
          id: updatePurchaseOrderDto.supplierId,
        },
      });

    if (!supplier) {
      throw new NotFoundException(
        'Supplier not found',
      );
    }
  }

  return this.prisma.purchaseOrder.update({
    where: {
      id,
    },
    data: {
      ...updatePurchaseOrderDto,

      orderDate:
        updatePurchaseOrderDto.orderDate
          ? new Date(
              updatePurchaseOrderDto.orderDate,
            )
          : undefined,

      expectedDate:
        updatePurchaseOrderDto.expectedDate
          ? new Date(
              updatePurchaseOrderDto.expectedDate,
            )
          : undefined,
    },

    select: purchaseOrderSelect,
  });
}

async cancel(id: string) {
  const purchaseOrder =
    await this.getPurchaseOrderOrThrow(id);

  if (purchaseOrder.status !== 'DRAFT') {
    throw new ConflictException(
      'Only draft purchase orders can be cancelled',
    );
  }

  return this.prisma.purchaseOrder.update({
    where: {
      id,
    },
    data: {
      status: 'CANCELLED',
    },
    select: purchaseOrderSelect,
  });
}
  private async getPurchaseOrderOrThrow(
  id: string,
) {
  const purchaseOrder =
    await this.prisma.purchaseOrder.findUnique({
      where: {
        id,
      },
      select: purchaseOrderSelect,
    });

  if (!purchaseOrder) {
    throw new NotFoundException(
      'Purchase order not found',
    );
  }

  return purchaseOrder;
}

async confirm(id: string) {
  const purchaseOrder =
    await this.getPurchaseOrderOrThrow(id);

  if (purchaseOrder.status !== PurchaseOrderStatus.DRAFT) {
    throw new ConflictException(
      'Only draft purchase orders can be confirmed',
    );
  }

  const items =
    await this.prisma.purchaseOrderItem.count({
      where: {
        purchaseOrderId: id,
      },
    });

  if (items === 0) {
    throw new ConflictException(
      'Purchase orders must have at least one item before confirmation',
    );
  }

  return this.prisma.purchaseOrder.update({
    where: {
      id,
    },
    data: {
      status: PurchaseOrderStatus.CONFIRMED,
    },
    select: purchaseOrderSelect,
  });
}
private async recalculateTotals(
  purchaseOrderId: string,
) {
  const items =
    await this.prisma.purchaseOrderItem.findMany({
      where: {
        purchaseOrderId,
      },
      select: {
        subtotal: true,
      },
    });

  const subtotal = items.reduce(
    (acc, item) => acc + Number(item.subtotal),
    0,
  );

  // Por ahora no manejamos impuestos
  const tax = 0;

  const total = subtotal + tax;

  await this.prisma.purchaseOrder.update({
    where: {
      id: purchaseOrderId,
    },
    data: {
      subtotal,
      tax,
      total,
    },
  });
}
}
