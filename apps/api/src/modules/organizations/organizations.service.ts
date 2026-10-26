import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrganizationDto: CreateOrganizationDto) {
    const newOrg = await this.prisma.organization.create({
      data: createOrganizationDto,
    });

    // Provisionar sucursal principal por defecto para la nueva organización
    await this.prisma.branch.create({
      data: {
        organizationId: newOrg.id,
        name: 'Sede Principal',
        code: 'MAIN',
        address: 'Sede Central',
        city: 'Principal',
        country: newOrg.country || 'Colombia',
        timezone: newOrg.timezone || 'America/Bogota',
        isActive: true,
      },
    });

    // Clonar el catálogo de roles operativos base y sus permisos hacia la nueva organización
    const templateOrg = await this.prisma.organization.findFirst({
      where: { id: { not: newOrg.id }, isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    if (templateOrg) {
      const templateRoles = await this.prisma.role.findMany({
        where: { organizationId: templateOrg.id, isActive: true },
        include: { rolePermissions: true },
      });

      for (const tRole of templateRoles) {
        const createdRole = await this.prisma.role.create({
          data: {
            organizationId: newOrg.id,
            code: tRole.code,
            name: tRole.name,
            description: tRole.description,
            isActive: true,
          },
        });

        if (tRole.rolePermissions.length > 0) {
          await this.prisma.rolePermission.createMany({
            data: tRole.rolePermissions.map((rp) => ({
              roleId: createdRole.id,
              permissionId: rp.permissionId,
            })),
            skipDuplicates: true,
          });
        }
      }
    }

    return newOrg;
  }

  async findAll() {
    return this.prisma.organization.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
