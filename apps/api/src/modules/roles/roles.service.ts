import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(createRoleDto: CreateRoleDto) {

  const organization =
    await this.prisma.organization.findUnique({
      where: {
        id: createRoleDto.organizationId,
      },
    });

  if (!organization) {
    throw new NotFoundException(
      'Organization not found',
    );
  }

  const existingRole =
    await this.prisma.role.findFirst({
      where: {
        organizationId:
          createRoleDto.organizationId,

        code: createRoleDto.code,
      },
    });

  if (existingRole) {
    throw new ConflictException(
      'Role code already exists',
    );
  }

  return this.prisma.role.create({
    data: {
      organizationId:
        createRoleDto.organizationId,

      name: createRoleDto.name,

      code: createRoleDto.code,

      description:
        createRoleDto.description,
    },
  });
}

  async findAll() {
  return this.prisma.role.findMany({
    where: {
      isActive: true,
    },

    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },

    orderBy: {
      name: 'asc',
    },
  });
}

  async findOne(id: string) {
  return this.getRoleOrThrow(id);
}

  async update(
  id: string,
  updateRoleDto: UpdateRoleDto,
) {
  await this.getRoleOrThrow(id);

  if (updateRoleDto.organizationId) {
    const organization =
      await this.prisma.organization.findUnique({
        where: {
          id: updateRoleDto.organizationId,
        },
      });

    if (!organization) {
      throw new NotFoundException(
        'Organization not found',
      );
    }
  }

  if (
    updateRoleDto.code &&
    updateRoleDto.organizationId
  ) {
    const existingRole =
      await this.prisma.role.findFirst({
        where: {
          organizationId:
            updateRoleDto.organizationId,

          code: updateRoleDto.code,

          NOT: {
            id,
          },
        },
      });

    if (existingRole) {
      throw new ConflictException(
        'Role code already exists',
      );
    }
  }

  return this.prisma.role.update({
    where: {
      id,
    },

    data: {
      organizationId:
        updateRoleDto.organizationId,

      name: updateRoleDto.name,

      code: updateRoleDto.code,

      description:
        updateRoleDto.description,
    },

    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

  async remove(id: string) {
  await this.getRoleOrThrow(id);

  return this.prisma.role.update({
    where: {
      id,
    },

    data: {
      isActive: false,
    },
  });
}

  private async getRoleOrThrow(id: string) {
  const role = await this.prisma.role.findUnique({
    where: {
      id,
    },

    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!role) {
    throw new NotFoundException(
      'Role not found',
    );
  }

  return role;
}
}
