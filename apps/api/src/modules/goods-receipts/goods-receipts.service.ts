import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';

import {
  goodsReceiptSelect,
} from '../../common/prisma/selects';

import { CreateGoodsReceiptDto } from './dto/create-goods-receipt.dto';
import { UpdateGoodsReceiptDto } from './dto/update-goods-receipt.dto';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}
  async create(
  createGoodsReceiptDto: CreateGoodsReceiptDto,
) {
    const organization =
    await this.prisma.organization.findUnique({
      where: {
        id: createGoodsReceiptDto.organizationId,
      },
    });

  if (!organization) {
    throw new NotFoundException(
      'Organization not found',
    );
  }
    const purchaseOrder =
    await this.prisma.purchaseOrder.findUnique({
      where: {
        id: createGoodsReceiptDto.purchaseOrderId,
      },
    });

  if (!purchaseOrder) {
    throw new NotFoundException(
      'Purchase order not found',
    );
  }
    if (purchaseOrder.status !== 'CONFIRMED') {
  throw new ConflictException(
    'Only confirmed purchase orders can be received',
  );
}
    if (createGoodsReceiptDto.receivedById) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: createGoodsReceiptDto.receivedById,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }
  }
    const existingGoodsReceipt =
    await this.prisma.goodsReceipt.findFirst({
      where: {
        organizationId:
          createGoodsReceiptDto.organizationId,

        number:
          createGoodsReceiptDto.number,
      },
    });

  if (existingGoodsReceipt) {
    throw new ConflictException(
      'A goods receipt with this number already exists',
    );
  }
    return this.prisma.goodsReceipt.create({
    data: {
      ...createGoodsReceiptDto,

      receivedDate: new Date(
        createGoodsReceiptDto.receivedDate,
      ),
    },

    select: goodsReceiptSelect,
  });
}


  async findAll() {
  return this.prisma.goodsReceipt.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: goodsReceiptSelect,
  });
}

  async findOne(id: string) {
  return this.getGoodsReceiptOrThrow(id);
}

  async update(
  id: string,
  updateGoodsReceiptDto: UpdateGoodsReceiptDto,
) {
  await this.getGoodsReceiptOrThrow(id);

  if (updateGoodsReceiptDto.receivedById) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: updateGoodsReceiptDto.receivedById,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }
  }

  return this.prisma.goodsReceipt.update({
    where: {
      id,
    },
    data: {
      ...updateGoodsReceiptDto,

      receivedDate:
        updateGoodsReceiptDto.receivedDate
          ? new Date(
              updateGoodsReceiptDto.receivedDate,
            )
          : undefined,
    },

    select: goodsReceiptSelect,
  });
}

  async remove(id: string) {
  await this.getGoodsReceiptOrThrow(id);

  await this.prisma.goodsReceipt.delete({
    where: {
      id,
    },
  });

  return {
    message:
      'Goods receipt removed successfully',
  };
}
private async getGoodsReceiptOrThrow(
  id: string,
) {
  const goodsReceipt =
    await this.prisma.goodsReceipt.findUnique({
      where: {
        id,
      },
      select: goodsReceiptSelect,
    });

  if (!goodsReceipt) {
    throw new NotFoundException(
      'Goods receipt not found',
    );
  }

  return goodsReceipt;
}
}
