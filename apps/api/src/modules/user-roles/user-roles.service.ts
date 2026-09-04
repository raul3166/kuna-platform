import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { userSelect } from '../../common/prisma/selects';
@Injectable()
export class UserRolesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async assignRoles(
  userId: string,
  assignUserRolesDto: AssignUserRolesDto,
) {
  await this.getUserOrThrow(userId);

  await this.getRolesOrThrow(
    assignUserRolesDto.roleIds,
  );

  const existingUserRoles =
    await this.prisma.userRole.findMany({
      where: {
        userId,
        roleId: {
          in: assignUserRolesDto.roleIds,
        },
      },
    });

  const existingRoleIds = new Set(
    existingUserRoles.map(
      (userRole) => userRole.roleId,
    ),
  );

  const rolesToCreate =
    assignUserRolesDto.roleIds
      .filter(
        (roleId) =>
          !existingRoleIds.has(roleId),
      )
      .map((roleId) => ({
        userId,
        roleId,
      }));

  if (rolesToCreate.length > 0) {
    await this.prisma.userRole.createMany({
      data: rolesToCreate,
    });
  }

  return this.prisma.user.findUnique({
    where: {
      id: userId,
    },

    include: {
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });
}

async getUserRoles(userId: string) {
  await this.getUserOrThrow(userId);

  return this.prisma.user.findUnique({
      where: {
        id: userId,
      },

      // 2. USAR OPERADOR SPREAD (...)
      select: {
        ...userSelect,

        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
}

async removeRole(
  userId: string,
  roleId: string,
) {
  await this.getUserOrThrow(userId);

  const role = await this.prisma.role.findUnique({
    where: {
      id: roleId,
    },
  });

  if (!role || !role.isActive) {
    throw new NotFoundException(
      'Role not found',
    );
  }

  const userRole =
    await this.prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId,
        },
      },
    });

  if (!userRole) {
    throw new NotFoundException(
      'Role is not assigned to this user',
    );
  }

  await this.prisma.userRole.delete({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
  });

  return this.prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      id: true,
      organizationId: true,
      branchId: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,

      userRoles: {
        include: {
          role: true,
        },
      },
    },
  });
}
  private async getUserOrThrow(id: string) {
  const user = await this.prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user || !user.isActive) {
    throw new NotFoundException(
      'User not found',
    );
  }

  return user;
}

private async getRolesOrThrow(
  roleIds: string[],
) {
  const roles = await this.prisma.role.findMany({
    where: {
      id: {
        in: roleIds,
      },
      isActive: true,
    },
  });

  if (roles.length !== roleIds.length) {
    throw new NotFoundException(
      'One or more roles not found',
    );
  }

  return roles;
}
}
