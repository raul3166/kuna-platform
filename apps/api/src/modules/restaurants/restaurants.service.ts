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
          orderBy: { tableNumber: 'asc' }, // Usamos tableNumber
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
        tableNumber: dto.tableNumber, // Sin conversiones, directamente string
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

  async updateTableStatus(tableId: string, status: TableStatus, currentSaleId?: string | null) {
    return this.prisma.restaurantTable.update({
      where: { id: tableId },
      data: {
        status,
        ...(currentSaleId !== undefined && { currentSaleId }),
      },
    });
  }

  // src/modules/restaurants/restaurants.service.ts

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
// En src/modules/restaurants/restaurants.service.ts

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

// En src/modules/restaurants/restaurants.service.ts

async getTableById(id: string) {
  const table = await this.prisma.restaurantTable.findUnique({
    where: { id },
  });

  if (!table) {
    throw new NotFoundException('Table not found');
  }

  return table;
}
}
