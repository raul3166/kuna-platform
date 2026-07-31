import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

import { customerSelect } from '../../common/prisma/selects';

@Injectable()
export class CustomersService {
  constructor(
  private readonly prisma: PrismaService,
) {}

async create(
  createCustomerDto: CreateCustomerDto,
) {
  const organization =
    await this.prisma.organization.findUnique({
      where: {
        id: createCustomerDto.organizationId,
      },
    });

  if (!organization) {
    throw new NotFoundException(
      'Organization not found',
    );
  }

  if (createCustomerDto.email) {
    const existingCustomer =
      await this.prisma.customer.findFirst({
        where: {
          organizationId:
            createCustomerDto.organizationId,
          email: createCustomerDto.email,
        },
      });

    if (existingCustomer) {
      throw new ConflictException(
        'Customer email already exists',
      );
    }
  }

  return this.prisma.customer.create({
    data: createCustomerDto,
    select: customerSelect,
  });
}

  async findAll() {
  return this.prisma.customer.findMany({
    where: {
      isActive: true,
    },

    orderBy: [
      {
        firstName: 'asc',
      },
      {
        companyName: 'asc',
      },
    ],

    select: customerSelect,
  });
}

  async findOne(id: string) {
  return this.getCustomerOrThrow(id);
}

  async update(
  id: string,
  updateCustomerDto: UpdateCustomerDto,
) {
  const customer =
    await this.getCustomerOrThrow(id);

  if (
    updateCustomerDto.email &&
    updateCustomerDto.email !== customer.email
  ) {
    const existingCustomer =
      await this.prisma.customer.findFirst({
        where: {
          organizationId:
            customer.organizationId,

          email: updateCustomerDto.email,

          NOT: {
            id,
          },
        },
      });

    if (existingCustomer) {
      throw new ConflictException(
        'Customer email already exists',
      );
    }
  }

  return this.prisma.customer.update({
    where: {
      id,
    },

    data: updateCustomerDto,

    select: customerSelect,
  });
}

  async remove(id: string) {
  await this.getCustomerOrThrow(id);

  return this.prisma.customer.update({
    where: {
      id,
    },

    data: {
      isActive: false,
    },

    select: customerSelect,
  });
}

  private async getCustomerOrThrow(
  id: string,
) {
  const customer =
    await this.prisma.customer.findFirst({
      where: {
        id,
        isActive: true,
      },

      select: customerSelect,
    });

  if (!customer) {
    throw new NotFoundException(
      'Customer not found',
    );
  }

  return customer;
}
}
