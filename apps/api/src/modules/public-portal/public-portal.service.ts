import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AppointmentStatus } from '@prisma/client';

@Injectable()
export class PublicPortalService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveOrganizationBySlugOrId(slugOrId: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        isActive: true,
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
      include: {
        organizationVerticals: {
          where: { isActive: true },
          include: { vertical: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Empresa u organización no encontrada');
    }

    return org;
  }

  /**
   * 1. Catálogo Público de la Organización (Sucursales, Verticales Activas, Servicios de Salón/Taller/Veterinaria y Especialistas)
   */
  async getPublicCatalog(slugOrId: string) {
    const org = await this.resolveOrganizationBySlugOrId(slugOrId);

    const [branches, serviceItems, serviceWorkers] = await Promise.all([
      this.prisma.branch.findMany({
        where: { organizationId: org.id, isActive: true },
        select: { id: true, name: true, address: true, city: true, phoneNumber: true },
      }),
      this.prisma.serviceItem.findMany({
        where: { organizationId: org.id, isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.serviceWorker.findMany({
        where: { organizationId: org.id, isActive: true },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialty: true,
          branchId: true,
        },
        orderBy: { firstName: 'asc' },
      }),
    ]);

    const activeVerticals = org.organizationVerticals.map((ov) => ov.vertical.code);

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        country: org.country,
        timezone: org.timezone,
      },
      activeVerticals,
      branches,
      serviceItems,
      serviceWorkers,
    };
  }

  /**
   * 2. Tracking en Vivo y Consulta 360° del Cliente
   * Busca por Cédula/NIT/Pasaporte, Correo, Celular, Placa de Vehículo (ABC-123), Nro. de Orden (OS-...) o Ticket de Lavandería
   */
  async trackCustomerOrOrder(slugOrId: string, queryStr: string) {
    const clean = (queryStr || '').trim();
    if (!clean) {
      throw new BadRequestException(
        'Ingresa tu número de documento, celular, correo, placa de vehículo o número de ticket/orden',
      );
    }

    const org = await this.resolveOrganizationBySlugOrId(slugOrId);

    // 1. Intentar encontrar cliente directo por documento, correo o teléfono
    let customer = await this.prisma.customer.findFirst({
      where: {
        organizationId: org.id,
        isActive: true,
        OR: [
          { identificationNumber: { equals: clean, mode: 'insensitive' } },
          { email: { equals: clean, mode: 'insensitive' } },
          { phoneNumber: { equals: clean } },
        ],
      },
    });

    // 2. Si no se encontró por documento, intentar por Placa de Vehículo (Automotive)
    if (!customer) {
      const vehicle = await this.prisma.vehicle.findFirst({
        where: {
          organizationId: org.id,
          licensePlate: { equals: clean, mode: 'insensitive' },
        },
        include: { customer: true },
      });
      if (vehicle?.customer) {
        customer = vehicle.customer;
      }
    }

    // 3. Si aún no se encontró, intentar por Nro. de Ticket de Lavandería
    if (!customer) {
      const ticket = await this.prisma.laundryTicket.findFirst({
        where: {
          organizationId: org.id,
          ticketNumber: { equals: clean, mode: 'insensitive' },
        },
        include: { customer: true },
      });
      if (ticket?.customer) {
        customer = ticket.customer;
      }
    }

    // 4. Si aún no se encontró, intentar por Nro. de Orden de Servicio (ServiceOrder)
    if (!customer) {
      const order = await this.prisma.serviceOrder.findFirst({
        where: {
          organizationId: org.id,
          OR: [
            { orderNumber: { equals: clean, mode: 'insensitive' } },
            { assetIdentifier: { equals: clean, mode: 'insensitive' } },
          ],
        },
        include: { customer: true },
      });
      if (order?.customer) {
        customer = order.customer;
      }
    }

    if (!customer) {
      throw new NotFoundException(
        'No encontramos registros con ese documento, placa o número de ticket. Si deseas agendar una cita nueva, puedes hacerlo directamente en la pestaña "Agendar Cita Online".',
      );
    }

    const [
      serviceOrders,
      laundryTickets,
      appointments,
      vehicles,
      pets,
      gymSubscriptions,
    ] = await Promise.all([
      // Órdenes de Servicio (Taller Automotriz, Servicios Técnicos, etc.)
      this.prisma.serviceOrder.findMany({
        where: {
          organizationId: org.id,
          customerId: customer.id,
        },
        include: {
          assignedWorker: { select: { firstName: true, lastName: true, specialty: true } },
          vehicle: true,
          pet: true,
          tasks: {
            include: { serviceItem: { select: { name: true } } },
          },
          materials: {
            include: { product: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      // Tickets de Lavandería (5 etapas Kanban + Perchero)
      this.prisma.laundryTicket.findMany({
        where: {
          organizationId: org.id,
          customerId: customer.id,
        },
        include: {
          items: true,
          worker: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
      }),
      // Citas de Salón / Barbería / Spa / Veterinaria
      this.prisma.appointment.findMany({
        where: {
          organizationId: org.id,
          customerId: customer.id,
        },
        include: {
          worker: { select: { id: true, firstName: true, lastName: true, specialty: true } },
          branch: { select: { id: true, name: true, address: true } },
          items: {
            include: { serviceItem: { select: { id: true, name: true, estimatedMinutes: true } } },
          },
        },
        orderBy: { startAt: 'desc' },
        take: 15,
      }),
      // Vehículos del cliente
      this.prisma.vehicle.findMany({
        where: {
          organizationId: org.id,
          customerId: customer.id,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // Mascotas y Carnet Digital de Vacunación / Consultas (Veterinaria)
      this.prisma.pet.findMany({
        where: {
          organizationId: org.id,
          customerId: customer.id,
          isActive: true,
        },
        include: {
          vaccinations: {
            include: {
              veterinarian: { select: { firstName: true, lastName: true } },
            },
            orderBy: { appliedAt: 'desc' },
          },
          medicalRecords: {
            include: {
              veterinarian: { select: { firstName: true, lastName: true } },
            },
            orderBy: { visitDate: 'desc' },
            take: 5,
          },
        },
      }),
      // Membresías de Gimnasio
      this.prisma.gymSubscription.findMany({
        where: {
          organizationId: org.id,
          customerId: customer.id,
        },
        include: {
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        identificationType: customer.identificationType,
        identificationNumber: customer.identificationNumber,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
        loyaltyPoints: customer.loyaltyPoints,
        medicalAlerts: customer.medicalAlerts,
      },
      serviceOrders,
      laundryTickets,
      appointments,
      vehicles,
      pets,
      gymSubscriptions,
    };
  }

  /**
   * 3. Agendar Cita Online desde el Portal Público (Belleza / Salón / Barbería / Spa / Veterinaria / Taller)
   */
  async createPublicAppointment(
    slugOrId: string,
    payload: {
      branchId?: string;
      serviceItemId: string;
      workerId?: string;
      appointmentDate: string; // YYYY-MM-DD
      appointmentTime: string; // HH:mm
      customerId?: string;
      firstName?: string;
      lastName?: string;
      identificationType?: string;
      identificationNumber?: string;
      email?: string;
      phoneNumber?: string;
      notes?: string;
    },
  ) {
    const org = await this.resolveOrganizationBySlugOrId(slugOrId);

    if (!payload.serviceItemId || !payload.appointmentDate || !payload.appointmentTime) {
      throw new BadRequestException('Selecciona el servicio, la fecha y la hora para tu cita');
    }

    const serviceItem = await this.prisma.serviceItem.findFirst({
      where: {
        id: payload.serviceItemId,
        organizationId: org.id,
      },
    });

    if (!serviceItem) {
      throw new NotFoundException('El servicio seleccionado no existe');
    }

    // Resolver sucursal activa
    let branchId = payload.branchId;
    if (!branchId) {
      const firstBranch = await this.prisma.branch.findFirst({
        where: { organizationId: org.id, isActive: true },
      });
      if (!firstBranch) {
        throw new BadRequestException('La organización no tiene una sucursal activa configurada');
      }
      branchId = firstBranch.id;
    }

    // Resolver o crear el Cliente en Customer Core
    let customerId = payload.customerId;
    if (!customerId) {
      const idNumber = (payload.identificationNumber || '').trim();
      const firstName = (payload.firstName || '').trim();
      const lastName = (payload.lastName || '').trim();
      const email = (payload.email || '').trim().toLowerCase();
      const phoneNumber = (payload.phoneNumber || '').trim();

      if (!idNumber || !firstName) {
        throw new BadRequestException('Ingresa tu nombre y número de documento para agendar tu cita');
      }

      const existing = await this.prisma.customer.findFirst({
        where: {
          organizationId: org.id,
          OR: [
            { identificationNumber: { equals: idNumber, mode: 'insensitive' } },
            ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : []),
          ],
        },
      });

      if (existing) {
        const updated = await this.prisma.customer.update({
          where: { id: existing.id },
          data: {
            firstName: firstName || existing.firstName,
            lastName: lastName || existing.lastName,
            phoneNumber: phoneNumber || existing.phoneNumber,
            email: email || existing.email,
          },
        });
        customerId = updated.id;
      } else {
        const created = await this.prisma.customer.create({
          data: {
            organizationId: org.id,
            identificationType: payload.identificationType || 'CC',
            identificationNumber: idNumber,
            firstName,
            lastName: lastName || null,
            email: email || null,
            phoneNumber: phoneNumber || null,
          },
        });
        customerId = created.id;
      }
    }

    const [year, month, day] = payload.appointmentDate.split('-').map(Number);
    const [hour, minute] = payload.appointmentTime.split(':').map(Number);
    const startAt = new Date(year, (month || 1) - 1, day || 1, hour || 9, minute || 0, 0, 0);

    const durationMinutes = Number(serviceItem.estimatedMinutes || 45);
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);

    const count = await this.prisma.appointment.count({
      where: { organizationId: org.id },
    });
    const appointmentNumber = `CITA-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const price = Number(serviceItem.basePrice || 0);

    return this.prisma.appointment.create({
      data: {
        organizationId: org.id,
        branchId,
        customerId,
        workerId: payload.workerId || null,
        appointmentNumber,
        startAt,
        endAt,
        status: AppointmentStatus.SCHEDULED,
        totalEstimated: price,
        notes: payload.notes
          ? `[Cita Online Portal] ${payload.notes.trim()}`
          : '[Cita Online Portal]',
        items: {
          create: [
            {
              organizationId: org.id,
              serviceItemId: serviceItem.id,
              workerId: payload.workerId || null,
              price,
              durationMinutes,
            },
          ],
        },
      },
      include: {
        customer: true,
        worker: { select: { id: true, firstName: true, lastName: true, specialty: true } },
        branch: { select: { id: true, name: true, address: true } },
        items: {
          include: { serviceItem: true },
        },
      },
    });
  }

  /**
   * 4. Cancelar cita agendada por el cliente desde el Portal Público
   */
  async cancelPublicAppointment(
    slugOrId: string,
    appointmentId: string,
    customerId: string,
    reason?: string,
  ) {
    const org = await this.resolveOrganizationBySlugOrId(slugOrId);

    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        organizationId: org.id,
        customerId,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Cita no encontrada para este cliente');
    }

    if (
      appointment.status !== AppointmentStatus.SCHEDULED &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new BadRequestException('Solo se pueden cancelar citas programadas o confirmadas que no hayan iniciado');
    }

    return this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelReason: reason || 'Cancelada por el cliente desde el Portal Público',
      },
    });
  }
}
