import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ToggleVerticalDto } from './dto/toggle-vertical.dto';
import { UpdateVerticalConfigDto } from './dto/update-vertical-config.dto';

@Injectable()
export class VerticalsService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureHolisticVerticalExists() {
    await this.prisma.vertical.upsert({
      where: { code: 'HOLISTIC' },
      update: {},
      create: {
        code: 'HOLISTIC',
        name: 'Terapias Holísticas & Bienestar',
        description:
          'Agenda de sesiones y terapias holísticas por terapeuta, expediente de pacientes, horarios y portal de reservas online.',
        icon: 'leaf',
        isCore: false,
        isActive: true,
      },
    });
  }

  /**
   * Obtiene el catálogo maestro de todos los verticales disponibles en KUNA
   */
  async findAll() {
    await this.ensureHolisticVerticalExists();
    return this.prisma.vertical.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Obtiene los verticales activos y disponibles para una organización específica
   */
  async findByOrganization(organizationId: string) {
    await this.ensureHolisticVerticalExists();
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organización con ID '${organizationId}' no encontrada.`,
      );
    }

    const allVerticals = await this.prisma.vertical.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    const orgVerticals = await this.prisma.organizationVertical.findMany({
      where: { organizationId },
      include: { vertical: true },
    });

    const orgMap = new Map(
      orgVerticals.map((ov) => [ov.vertical.code, ov]),
    );

    return allVerticals.map((v) => {
      const ov = orgMap.get(v.code);
      return {
        id: v.id,
        code: v.code,
        name: v.name,
        description: v.description,
        icon: v.icon,
        isCore: v.isCore,
        isActiveForOrg: ov ? ov.isActive : false,
        activatedAt: ov?.activatedAt ?? null,
        config: ov?.config ?? null,
      };
    });
  }

  /**
   * Activa o desactiva un vertical para una organización determinada
   */
  async toggle(organizationId: string, toggleDto: ToggleVerticalDto) {
    const vertical = await this.prisma.vertical.findUnique({
      where: { code: toggleDto.verticalCode },
    });

    if (!vertical) {
      throw new NotFoundException(
        `El vertical con código '${toggleDto.verticalCode}' no existe en el catálogo.`,
      );
    }

    const orgVertical = await this.prisma.organizationVertical.upsert({
      where: {
        organizationId_verticalId: {
          organizationId,
          verticalId: vertical.id,
        },
      },
      update: {
        isActive: toggleDto.isActive,
      },
      create: {
        organizationId,
        verticalId: vertical.id,
        isActive: toggleDto.isActive,
      },
      include: {
        vertical: true,
      },
    });

    return {
      message: `Vertical ${vertical.name} ${toggleDto.isActive ? 'activado' : 'desactivado'} exitosamente.`,
      organizationVertical: orgVertical,
    };
  }

  /**
   * Actualiza la configuración personalizada de un vertical para una organización
   */
  async updateConfig(
    organizationId: string,
    verticalCode: string,
    updateConfigDto: UpdateVerticalConfigDto,
  ) {
    const vertical = await this.prisma.vertical.findUnique({
      where: { code: verticalCode },
    });

    if (!vertical) {
      throw new NotFoundException(
        `El vertical con código '${verticalCode}' no existe.`,
      );
    }

    const orgVertical = await this.prisma.organizationVertical.findUnique({
      where: {
        organizationId_verticalId: {
          organizationId,
          verticalId: vertical.id,
        },
      },
    });

    if (!orgVertical) {
      throw new NotFoundException(
        `El vertical '${verticalCode}' no está registrado para esta organización.`,
      );
    }

    return this.prisma.organizationVertical.update({
      where: {
        organizationId_verticalId: {
          organizationId,
          verticalId: vertical.id,
        },
      },
      data: {
        config: updateConfigDto.config,
      },
      include: {
        vertical: true,
      },
    });
  }
}

