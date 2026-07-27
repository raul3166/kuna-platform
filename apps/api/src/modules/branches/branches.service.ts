import { ConflictException,
  Injectable,
  NotFoundException, } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}


async create(createBranchDto: CreateBranchDto) {
  // 1. Validar que la organización exista

  const organization = await this.prisma.organization.findUnique({
    where: {
      id: createBranchDto.organizationId,
    },
  });

  if (!organization) {
    throw new NotFoundException('Organization not found');
  }

  // 2. Validar que el código no exista dentro de la organización

  const existingBranch = await this.prisma.branch.findFirst({
    where: {
      organizationId: createBranchDto.organizationId,
      code: createBranchDto.code,
    },
  });

  if (existingBranch) {
    throw new ConflictException(
      'A branch with this code already exists for this organization',
    );
  }

  // 3. Crear la sucursal

  return this.prisma.branch.create({
    data: {
  organizationId: createBranchDto.organizationId,
  name: createBranchDto.name,
  code: createBranchDto.code,
  address: createBranchDto.address,
  city: createBranchDto.city,
  country: createBranchDto.country,
  phoneNumber: createBranchDto.phoneNumber,
  timezone: createBranchDto.timezone,
},
  });
}
async findAll() {
  return this.prisma.branch.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: 'asc',
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
}

async findOne(id: string) {
  return this.getBranchOrThrow(id);
}

async update(id: string, updateBranchDto: UpdateBranchDto) {
  const branch = await this.getBranchOrThrow(id);

  if (
    updateBranchDto.code &&
    updateBranchDto.code !== branch.code
  ) {
    const existingBranch = await this.prisma.branch.findFirst({
      where: {
        organizationId: branch.organizationId,
        code: updateBranchDto.code,
        NOT: {
          id,
        },
      },
    });

    if (existingBranch) {
      throw new ConflictException(
        'A branch with this code already exists for this organization',
      );
    }
  }

  return this.prisma.branch.update({
    where: {
      id,
    },
    data: updateBranchDto,
  });
}
async remove(id: string) {
  await this.getBranchOrThrow(id);

  return this.prisma.branch.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
  });
}
private async getBranchOrThrow(id: string) {
  const branch = await this.prisma.branch.findFirst({
    where: {
      id,
      isActive: true,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!branch) {
    throw new NotFoundException('Branch not found');
  }

  return branch;
}
}
