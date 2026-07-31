import { ConflictException,
  Injectable,
  NotFoundException} from '@nestjs/common';
  import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { userSelect } from '../../common/prisma/selects';
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}


async create(createUserDto: CreateUserDto) {
  const organization = await this.prisma.organization.findUnique({
  where: {
    id: createUserDto.organizationId,
  },
});

if (!organization) {
  throw new NotFoundException('Organization not found');
}
const branch = await this.prisma.branch.findUnique({
  where: {
    id: createUserDto.branchId,
  },
});

if (!branch) {
  throw new NotFoundException('Branch not found');
}
if (branch.organizationId !== createUserDto.organizationId) {
  throw new ConflictException(
    'Branch does not belong to the organization',
  );
}
const existingUser = await this.prisma.user.findUnique({
  where: {
    email: createUserDto.email,
  },
});

if (existingUser) {
  throw new ConflictException(
    'A user with this email already exists',
  );
}
const passwordHash = await bcrypt.hash(
  createUserDto.password,
  10,
);
return this.prisma.user.create({
  data: {
    organizationId: createUserDto.organizationId,
    branchId: createUserDto.branchId,
    firstName: createUserDto.firstName,
    lastName: createUserDto.lastName,
    email: createUserDto.email,
    passwordHash: passwordHash,
    phoneNumber: createUserDto.phoneNumber,
  },
  select: userSelect,
});
}

async findAll() {
  return this.prisma.user.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      firstName: 'asc',
    },
    select: userSelect,
  });
}

  async findOne(id: string) {
  return this.getUserOrThrow(id);
}

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.getUserOrThrow(id);
    if (
  updateUserDto.email &&
  updateUserDto.email !== user.email
) {
  const existingUser = await this.prisma.user.findUnique({
    where: {
      email: updateUserDto.email,
    },
  });

  if (existingUser) {
    throw new ConflictException(
      'A user with this email already exists',
    );
  }
}
if (
  updateUserDto.branchId &&
  updateUserDto.branchId !== user.branchId
) {
  const branch = await this.prisma.branch.findUnique({
    where: {
      id: updateUserDto.branchId,
    },
  });

  if (!branch) {
    throw new NotFoundException('Branch not found');
  }

  if (branch.organizationId !== user.organizationId) {
    throw new ConflictException(
      'Branch does not belong to the organization',
    );
  }
}
return this.prisma.user.update({
  where: {
    id,
  },
  data: {
    firstName: updateUserDto.firstName,
    lastName: updateUserDto.lastName,
    email: updateUserDto.email,
    phoneNumber: updateUserDto.phoneNumber,
    branchId: updateUserDto.branchId,
  },
  select: userSelect,
});
  }

  async remove(id: string) {
  await this.getUserOrThrow(id);

  return this.prisma.user.update({
    where: {
      id,
    },
    data: {
      isActive: false,
    },
    select: userSelect,
  });
}

  private async getUserOrThrow(id: string) {
  const user = await this.prisma.user.findUnique({
    where: {
      id,
    },
    select: userSelect,
  });

  if (!user || !user.isActive) {
    throw new NotFoundException('User not found');
  }

  return user;
}

}
