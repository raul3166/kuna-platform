import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';

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

async assignPermissions(
  roleId: string,
  assignPermissionsDto: AssignPermissionsDto,
) {
  await this.getRoleOrThrow(roleId);

  await this.getPermissionsOrThrow(
    assignPermissionsDto.permissionIds,
  );

  const existingPermissions =
    await this.prisma.rolePermission.findMany({
      where: {
        roleId,
        permissionId: {
          in: assignPermissionsDto.permissionIds,
        },
      },
    });

  const existingPermissionIds = new Set(
    existingPermissions.map(
      (permission) => permission.permissionId,
    ),
  );

  const permissionsToCreate =
    assignPermissionsDto.permissionIds
      .filter(
        (permissionId) =>
          !existingPermissionIds.has(permissionId),
      )
      .map((permissionId) => ({
        roleId,
        permissionId,
      }));

  if (permissionsToCreate.length > 0) {
    await this.prisma.rolePermission.createMany({
      data: permissionsToCreate,
    });
  }

  return this.prisma.role.findUnique({
    where: {
      id: roleId,
    },

    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });
}

async getRolePermissions(id: string) {
  await this.getRoleOrThrow(id);

  return this.prisma.role.findUnique({
    where: {
      id,
    },

    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
    },
  });
}

async removePermission(
  roleId: string,
  permissionId: string,
) {
  await this.getRoleOrThrow(roleId);

  const rolePermission =
    await this.prisma.rolePermission.findFirst({
      where: {
        roleId,
        permissionId,
      },
    });

  if (!rolePermission) {
    throw new NotFoundException(
      'Permission is not assigned to this role',
    );
  }

  await this.prisma.rolePermission.delete({
    where: {
      id: rolePermission.id,
    },
  });

  return this.prisma.role.findUnique({
    where: {
      id: roleId,
    },
    include: {
      rolePermissions: {
        include: {
          permission: true,
        },
      },
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
private async getPermissionsOrThrow(
  permissionIds: string[],
) {
  const permissions =
    await this.prisma.permission.findMany({
      where: {
        id: {
          in: permissionIds,
        },
        isActive: true,
      },
    });

  if (permissions.length !== permissionIds.length) {
    throw new NotFoundException(
      'One or more permissions not found',
    );
  }

  return permissions;
}
}
