import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY, PERMISSIONS_ANY_KEY } from '../decorators/permissions.decorator';
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

    const requiredAnyPermissions =
      this.reflector.getAllAndOverride<string[]>(
        PERMISSIONS_ANY_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    const hasRequired = requiredPermissions && requiredPermissions.length > 0;
    const hasRequiredAny = requiredAnyPermissions && requiredAnyPermissions.length > 0;

    if (!hasRequired && !hasRequiredAny) {
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

    if (hasRequired) {
      const hasAll = requiredPermissions.every((permission) =>
        userPermissions.includes(permission),
      );
      if (!hasAll) {
        throw new ForbiddenException(
          'You do not have permission to perform this action',
        );
      }
    }

    if (hasRequiredAny) {
      const hasAny = requiredAnyPermissions.some((permission) =>
        userPermissions.includes(permission),
      );
      if (!hasAny) {
        throw new ForbiddenException(
          'You do not have permission to perform this action',
        );
      }
    }


return true;
  }
}
