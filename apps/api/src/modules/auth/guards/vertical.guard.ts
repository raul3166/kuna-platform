import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { REQUIRES_VERTICAL_KEY } from '../decorators/requires-vertical.decorator';

@Injectable()
export class VerticalGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredVerticals = this.reflector.getAllAndOverride<string[]>(
      REQUIRES_VERTICAL_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si no requiere ningún vertical en específico, permite el paso
    if (!requiredVerticals || requiredVerticals.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Obtener organizationId de los headers, query, body o usuario autenticado
    let organizationId =
      (request.headers['x-organization-id'] as string) ||
      request.query?.organizationId ||
      request.body?.organizationId;

    if (!organizationId && user?.id) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { organizationId: true },
      });
      organizationId = dbUser?.organizationId;
    }

    if (!organizationId) {
      throw new ForbiddenException(
        'No se pudo determinar la organización para validar la activación del vertical.',
      );
    }

    request.organizationId = organizationId;
    if (user) {
      user.organizationId = organizationId;
    }

    // Verificar si la organización tiene activo al menos uno de los verticales requeridos
    const activeVertical = await this.prisma.organizationVertical.findFirst({
      where: {
        organizationId,
        isActive: true,
        vertical: {
          code: { in: requiredVerticals },
        },
      },
      include: {
        vertical: true,
      },
    });

    if (!activeVertical) {
      throw new ForbiddenException(
        `El vertical '${requiredVerticals.join(', ')}' no se encuentra habilitado para esta organización.`,
      );
    }

    return true;
  }
}

