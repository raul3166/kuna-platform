import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TableStatus } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateRoomDto, UpdateTableDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(dto: CreateRoomDto) {
    return this.prisma.room.create({
      data: {
        name: dto.name,
        organizationId: dto.organizationId,
        branchId: dto.branchId,
      },
    });
  }

  async getRoomsByBranch(organizationId?: string, branchId?: string) {
    return this.prisma.room.findMany({
      where: {
        ...(branchId && { branchId }),
        ...(organizationId && { organizationId }),
      },
      include: {
        tables: {
          orderBy: { tableNumber: 'asc' },
        },
      },
    });
  }

  async updateRoom(id: string, dto: UpdateRoomDto) {
    return this.prisma.room.update({
      where: { id },
      data: dto,
    });
  }

  async createTable(dto: CreateTableDto) {
    return this.prisma.restaurantTable.create({
      data: {
        tableNumber: dto.tableNumber,
        capacity: dto.capacity,
        roomId: dto.roomId,
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async updateTable(id: string, dto: UpdateTableDto) {
    return this.prisma.restaurantTable.update({
      where: { id },
      data: dto,
    });
  }

  async updateTableStatus(tableId: string, status: TableStatus, currentOrderId?: string | null) {
    return this.prisma.restaurantTable.update({
      where: { id: tableId },
      data: {
        status,
        ...(currentOrderId !== undefined && { currentOrderId }),
      },
    });
  }

  async setBillPrinted(tableId: string) {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new NotFoundException('La mesa no existe');
    }

    if (table.status !== TableStatus.OCCUPIED) {
      throw new BadRequestException(
        `No se puede imprimir la precuenta de una mesa en estado ${table.status}`,
      );
    }

    return this.prisma.restaurantTable.update({
      where: { id: tableId },
      data: { status: TableStatus.BILL_PRINTED },
    });
  }

  async getAllTables(organizationId?: string, branchId?: string) {
    return this.prisma.restaurantTable.findMany({
      where: {
        room: {
          ...(branchId && { branchId }),
          ...(organizationId && { organizationId }),
        },
      },
      include: {
        room: true,
      },
      orderBy: {
        tableNumber: 'asc',
      },
    });
  }

  async getTableById(id: string) {
    const table = await this.prisma.restaurantTable.findUnique({
      where: { id },
      include: {
        room: true,
        currentOrder: {
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }
}
