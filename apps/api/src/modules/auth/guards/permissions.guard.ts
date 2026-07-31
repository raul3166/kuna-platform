import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
  private readonly reflector: Reflector,
  private readonly prisma: PrismaService,
) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {

    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (
      !requiredPermissions ||
      requiredPermissions.length === 0
    ) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'User not authenticated',
      );
    }


 const dbUser = await this.prisma.user.findUnique({
  where: {
    id: user.id,
  },

  include: {
    userRoles: {
      where: {
        role: {
          isActive: true,
        },
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    },
  },
});

if (!dbUser) {
  throw new ForbiddenException(
    'User not found',
  );
}
const userPermissions =
  dbUser.userRoles.flatMap((userRole) =>
    userRole.role.rolePermissions.map(
      (rolePermission) =>
        rolePermission.permission.code,
    ),
  );

  const hasPermission =
  requiredPermissions.every((permission) =>
    userPermissions.includes(permission),
  );
if (!hasPermission) {
  throw new ForbiddenException(
    'You do not have permission to perform this action',
  );
}

return true;
  }
}
