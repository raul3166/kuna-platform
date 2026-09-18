import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateHotelRoomDto } from './dto/create-hotel-room.dto';
import { UpdateHotelRoomDto } from './dto/update-hotel-room.dto';
import { HotelRoomStatus } from '@prisma/client';

export interface FindAllRoomsParams {
  organizationId: string;
  branchId?: string;
  status?: HotelRoomStatus;
  roomType?: string;
}

@Injectable()
export class HotelRoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHotelRoomDto) {
    const existingRoom = await this.prisma.hotelRoom.findFirst({
      where: {
        organizationId: dto.organizationId,
        branchId: dto.branchId,
        roomNumber: dto.roomNumber,
      },
    });

    if (existingRoom) {
      throw new ConflictException(`La habitación ${dto.roomNumber} ya existe en esta sucursal`);
    }

    return this.prisma.hotelRoom.create({
      data: {
        ...dto,
        status: dto.status || HotelRoomStatus.AVAILABLE,
      },
    });
  }

  async findAll(params: FindAllRoomsParams) {
    return this.prisma.hotelRoom.findMany({
      where: {
        organizationId: params.organizationId,
        ...(params.branchId ? { branchId: params.branchId } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.roomType ? { roomType: params.roomType } : {}),
      },
      orderBy: { roomNumber: 'asc' },
    });
  }

  async update(id: string, organizationId: string, dto: UpdateHotelRoomDto) {
    const room = await this.prisma.hotelRoom.findFirst({
      where: { id, organizationId },
    });

    if (!room) {
      throw new NotFoundException('Habitación no encontrada');
    }

    if (dto.roomNumber && dto.roomNumber !== room.roomNumber) {
      const existingRoom = await this.prisma.hotelRoom.findFirst({
        where: {
          organizationId,
          branchId: room.branchId,
          roomNumber: dto.roomNumber,
          id: { not: id },
        },
      });

      if (existingRoom) {
        throw new ConflictException(`Ya existe otra habitación con el número ${dto.roomNumber}`);
      }
    }

    return this.prisma.hotelRoom.update({
      where: { id },
      data: {
        ...(dto.roomNumber && { roomNumber: dto.roomNumber }),
        ...(dto.roomType && { roomType: dto.roomType }),
        ...(dto.capacity !== undefined && { capacity: Number(dto.capacity) }),
        ...(dto.pricePerNight !== undefined && { pricePerNight: dto.pricePerNight }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async updateStatus(id: string, organizationId: string, status: HotelRoomStatus) {
    const room = await this.prisma.hotelRoom.findFirst({
      where: { id, organizationId },
    });

    if (!room) {
      throw new NotFoundException('Habitación no encontrada');
    }

    return this.prisma.hotelRoom.update({
      where: { id },
      data: { status },
    });
  }

  async remove(id: string, organizationId: string) {
    const room = await this.prisma.hotelRoom.findFirst({
      where: { id, organizationId },
      include: {
        hotelReservations: {
          where: {
            status: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Habitación no encontrada');
    }

    if (room.hotelReservations && room.hotelReservations.length > 0) {
      throw new BadRequestException('No se puede eliminar la habitación porque tiene reservas activas o en estancia');
    }

    return this.prisma.hotelRoom.delete({
      where: { id },
    });
  }
}
