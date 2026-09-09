import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateStudioScheduleDto } from './dto/create-studio-schedule.dto';
import { UpdateStudioScheduleDto } from './dto/update-studio-schedule.dto';

@Injectable()
export class StudioSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudioScheduleDto) {
    return this.prisma.studioSchedule.create({
      data: dto,
    });
  }

  async findAll(organizationId: string, branchId?: string) {
    return this.prisma.studioSchedule.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.studioSchedule.findUnique({
      where: { id },
      include: {
        branch: {
          select: { id: true, name: true },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(`Horario con ID ${id} no encontrado`);
    }

    return schedule;
  }

  async update(id: string, dto: UpdateStudioScheduleDto) {
    await this.findOne(id);
    return this.prisma.studioSchedule.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.studioSchedule.delete({
      where: { id },
    });
  }
}
