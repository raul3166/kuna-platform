import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}
  async create(
  createPermissionDto: CreatePermissionDto,
) {
  const existingPermission =
    await this.prisma.permission.findUnique({
      where: {
        code: createPermissionDto.code,
      },
    });

  if (existingPermission) {
    throw new ConflictException(
      'Permission code already exists',
    );
  }

  return this.prisma.permission.create({
    data: {
      module: createPermissionDto.module,
      code: createPermissionDto.code,
      name: createPermissionDto.name,
      description:
        createPermissionDto.description,
    },
  });
}

  async findAll() {
  return this.prisma.permission.findMany({
    where: {
      isActive: true,
    },

    orderBy: [
      {
        module: 'asc',
      },
      {
        code: 'asc',
      },
    ],
  });
}

  async findOne(id: string) {
  await this.getPermissionOrThrow(id);

  return this.prisma.permission.findUnique({
    where: {
      id,
    },
  });
}

  async update(
  id: string,
  updatePermissionDto: UpdatePermissionDto,
) {
  const permission =
    await this.getPermissionOrThrow(id);

  if (
    updatePermissionDto.code &&
    updatePermissionDto.code !== permission.code
  ) {
    const existingPermission =
      await this.prisma.permission.findUnique({
        where: {
          code: updatePermissionDto.code,
        },
      });

    if (existingPermission) {
      throw new ConflictException(
        'Permission code already exists',
      );
    }
  }

  return this.prisma.permission.update({
    where: {
      id,
    },

    data: updatePermissionDto,
  });
}

  async remove(id: string) {
  await this.getPermissionOrThrow(id);

  return this.prisma.permission.update({
    where: {
      id,
    },

    data: {
      isActive: false,
    },
  });
}

  private async getPermissionOrThrow(id: string) {
  const permission = await this.prisma.permission.findUnique({
    where: {
      id,
    },
  });

  if (!permission) {
    throw new NotFoundException('Permission not found');
  }

  return permission;
}
}
