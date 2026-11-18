import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateHotelReservationDto } from './dto/create-hotel-reservation.dto';
import { CheckOutReservationDto } from './dto/checkout-reservation.dto';
import { CreateHotelRoomChargeDto } from './dto/create-hotel-room-charge.dto';
import { TransferRoomDto } from './dto/transfer-room.dto';
import { ExtendStayDto } from './dto/extend-stay.dto';
import { CancelReservationDto } from './dto/cancel-reservation.dto';
import { ReservationStatus, HotelRoomStatus, SaleStatus, PaymentMethod } from '@prisma/client';

export interface FindAllReservationsParams {
  organizationId: string;
  branchId?: string;
  hotelRoomId?: string;
  customerId?: string;
  status?: ReservationStatus;
}

@Injectable()
export class HotelReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseLocalDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  private calculateNights(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  }

  async create(dto: CreateHotelReservationDto) {
    if (!dto.organizationId || !dto.branchId) {
      throw new BadRequestException('organizationId y branchId son requeridos');
    }

    const checkInDate = this.parseLocalDate(dto.checkInDate);
    const checkOutDate = this.parseLocalDate(dto.checkOutDate);

    if (checkInDate >= checkOutDate) {
      throw new BadRequestException('La fecha de salida (check-out) debe ser posterior a la de entrada (check-in)');
    }

    const room = await this.prisma.hotelRoom.findFirst({
      where: { id: dto.hotelRoomId, organizationId: dto.organizationId },
    });

    if (!room) {
      throw new NotFoundException('La habitación seleccionada no existe');
    }

    const overlappingReservation = await this.prisma.hotelReservation.findFirst({
      where: {
        hotelRoomId: dto.hotelRoomId,
        status: { notIn: ['CANCELLED', 'CHECKED_OUT', 'NO_SHOW'] },
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
      },
    });

    if (overlappingReservation) {
      throw new ConflictException('La habitación no está disponible durante las fechas seleccionadas');
    }

    const nights = this.calculateNights(checkInDate, checkOutDate);
    const nightlyRate = dto.nightlyRate !== undefined ? Number(dto.nightlyRate) : Number(room.pricePerNight || 0);
    const totalAmount = dto.totalAmount !== undefined ? Number(dto.totalAmount) : nights * nightlyRate;

    return this.prisma.hotelReservation.create({
      data: {
        organizationId: dto.organizationId,
        branchId: dto.branchId,
        customerId: dto.customerId,
        hotelRoomId: dto.hotelRoomId,
        checkInDate,
        checkOutDate,
        nightlyRate,
        totalAmount,
        notes: dto.notes,
        status: dto.status || ReservationStatus.CONFIRMED,
      },
      include: {
        customer: true,
        hotelRoom: true,
        charges: true,
      },
    });
  }

  async findAll(params: FindAllReservationsParams) {
    return this.prisma.hotelReservation.findMany({
      where: {
        organizationId: params.organizationId,
        ...(params.branchId ? { branchId: params.branchId } : {}),
        ...(params.hotelRoomId ? { hotelRoomId: params.hotelRoomId } : {}),
        ...(params.customerId ? { customerId: params.customerId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
      include: {
        customer: true,
        hotelRoom: true,
        charges: true,
        sale: true,
      },
      orderBy: { checkInDate: 'asc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const reservation = await this.prisma.hotelReservation.findFirst({
      where: { id, organizationId },
      include: { customer: true, hotelRoom: true, charges: true, sale: true },
    });

    if (!reservation) {
      throw new NotFoundException('Reserva no encontrada');
    }

    return reservation;
  }

  async checkIn(id: string, organizationId: string) {
    const reservation = await this.findOne(id, organizationId);

    if (reservation.status === ReservationStatus.CHECKED_IN) {
      throw new ConflictException('La reserva ya se encuentra en estancia (Check-In realizado)');
    }

    if (
      reservation.status === ReservationStatus.CANCELLED ||
      reservation.status === ReservationStatus.CHECKED_OUT ||
      reservation.status === ReservationStatus.NO_SHOW
    ) {
      throw new ConflictException(`No se puede realizar Check-In en una reserva ${reservation.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedReservation = await tx.hotelReservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CHECKED_IN,
          actualCheckInAt: new Date(),
        },
        include: { customer: true, hotelRoom: true, charges: true },
      });

      await tx.hotelRoom.update({
        where: { id: reservation.hotelRoomId },
        data: { status: HotelRoomStatus.OCCUPIED },
      });

      return updatedReservation;
    });
  }

  async confirmReservation(id: string, organizationId: string) {
    const reservation = await this.findOne(id, organizationId);

    if (reservation.status !== ReservationStatus.PENDING) {
      throw new ConflictException('Solo se pueden confirmar reservas que estén en estado PENDING');
    }

    // Validar que no exista otra reserva confirmada/en estancia que se solape
    const overlap = await this.prisma.hotelReservation.findFirst({
      where: {
        hotelRoomId: reservation.hotelRoomId,
        id: { not: id },
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.CHECKED_IN] },
        checkInDate: { lt: reservation.checkOutDate },
        checkOutDate: { gt: reservation.checkInDate },
      },
    });

    if (overlap) {
      throw new ConflictException('La habitación ya tiene una reserva confirmada o en estancia para esas fechas');
    }

    return this.prisma.hotelReservation.update({
      where: { id },
      data: {
        status: ReservationStatus.CONFIRMED,
      },
      include: { customer: true, hotelRoom: true, charges: true },
    });
  }

  async checkOut(id: string, organizationId?: string, dto?: CheckOutReservationDto) {
    const orgId = organizationId || dto?.organizationId;
    if (!orgId) {
      throw new BadRequestException('organizationId es requerido para realizar Check-Out');
    }
    const reservation = await this.findOne(id, orgId);

    if (reservation.status !== ReservationStatus.CHECKED_IN && reservation.status !== ReservationStatus.CONFIRMED) {
      throw new ConflictException('La reserva debe estar en estancia (CHECKED_IN) para realizar Check-Out');
    }

    if (reservation.saleId) {
      throw new ConflictException('Esta reserva ya cuenta con una factura de liquidación asociada');
    }

    return this.prisma.$transaction(async (tx) => {
      const nights = this.calculateNights(new Date(reservation.checkInDate), new Date(reservation.checkOutDate));
      const nightlyRate = Number(reservation.nightlyRate || reservation.hotelRoom.pricePerNight || 0);
      const staySubtotal = Number(reservation.totalAmount || nights * nightlyRate);

      const saleItems: any[] = [
        {
          quantity: nights,
          unitPrice: nightlyRate,
          subtotal: staySubtotal,
          total: staySubtotal,
          description: `Hospedaje - Habitación ${reservation.hotelRoom.roomNumber} (${nights} noche${nights > 1 ? 's' : ''})`,
        },
      ];

      let chargesTotal = 0;
      for (const charge of reservation.charges) {
        const itemTotal = Number(charge.amount) * charge.quantity;
        chargesTotal += itemTotal;
        saleItems.push({
          quantity: charge.quantity,
          unitPrice: Number(charge.amount),
          subtotal: itemTotal,
          total: itemTotal,
          description: charge.description,
          ...(charge.productId ? { product: { connect: { id: charge.productId } } } : {}),
        });
      }

      const grandTotal = staySubtotal + chargesTotal;

      const resolution = await tx.billingResolution.findFirst({
        where: { branchId: reservation.branchId, organizationId: orgId, isActive: true },
      });

      let saleNumber = `HOTEL-${Date.now()}`;
      if (resolution && resolution.currentNumber <= resolution.toNumber && new Date() <= new Date(resolution.expiryDate)) {
        saleNumber = `${resolution.prefix}-${resolution.currentNumber}`;
        await tx.billingResolution.update({
          where: { id: resolution.id },
          data: { currentNumber: { increment: 1 } },
        });
      }

      const paymentMethod = dto?.paymentMethod || PaymentMethod.CASH;

      const sale = await tx.sale.create({
        data: {
          organizationId: reservation.organizationId,
          branchId: reservation.branchId,
          customerId: reservation.customerId,
          saleNumber,
          subtotal: grandTotal,
          total: grandTotal,
          status: SaleStatus.CONFIRMED,
          notes: dto?.notes || `Liquidación de Hospedaje - Hab. ${reservation.hotelRoom.roomNumber}`,
          items: { create: saleItems },
          payments: {
            create: [
              {
                organizationId: reservation.organizationId,
                method: paymentMethod,
                amount: grandTotal,
                reference: `CHECKOUT-${reservation.id}`,
              },
            ],
          },
        } as any,
      });

      const updatedReservation = await tx.hotelReservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CHECKED_OUT,
          saleId: sale.id,
          actualCheckOutAt: new Date(),
        },
        include: { customer: true, hotelRoom: true, charges: true, sale: true },
      });

      await tx.hotelRoom.update({
        where: { id: reservation.hotelRoomId },
        data: { status: HotelRoomStatus.CLEANING },
      });

      // Acumular puntos de fidelidad por estadía liquidada (1 punto por cada $1.000 COP)
      if (reservation.customerId && grandTotal >= 1000) {
        const earnedPoints = Math.floor(grandTotal / 1000);
        if (earnedPoints > 0) {
          await tx.customer.update({
            where: { id: reservation.customerId },
            data: { loyaltyPoints: { increment: earnedPoints } },
          });
        }
      }

      return updatedReservation;
    });
  }

  async cancel(id: string, organizationId?: string, dto?: CancelReservationDto) {
    const orgId = organizationId || dto?.organizationId;
    if (!orgId) {
      throw new BadRequestException('organizationId es requerido para cancelar la reserva');
    }
    const reservation = await this.findOne(id, orgId);

    if (reservation.status === ReservationStatus.CHECKED_OUT) {
      throw new ConflictException('No se puede cancelar una reserva ya liquidada');
    }

    return this.prisma.$transaction(async (tx) => {
      if (reservation.status === ReservationStatus.CHECKED_IN) {
        await tx.hotelRoom.update({
          where: { id: reservation.hotelRoomId },
          data: { status: HotelRoomStatus.CLEANING },
        });
      }

      return tx.hotelReservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CANCELLED,
          cancellationReason: dto?.reason,
          cancellationCharge: dto?.cancellationCharge,
        },
        include: { customer: true, hotelRoom: true },
      });
    });
  }

  // ── FASE 6A: Cambio de Habitación ──────────────────────────────────
  async transferRoom(id: string, dto: TransferRoomDto) {
    const reservation = await this.findOne(id, dto.organizationId);

    if (reservation.status !== ReservationStatus.CHECKED_IN && reservation.status !== ReservationStatus.CONFIRMED) {
      throw new ConflictException('Solo se puede hacer cambio de habitación en reservas CONFIRMED o CHECKED_IN');
    }

    if (dto.newRoomId === reservation.hotelRoomId) {
      throw new BadRequestException('La habitación de destino debe ser diferente a la actual');
    }

    // Verificar que la nueva habitación exista y esté disponible
    const newRoom = await this.prisma.hotelRoom.findFirst({
      where: { id: dto.newRoomId, organizationId: dto.organizationId },
    });

    if (!newRoom) {
      throw new NotFoundException('La habitación de destino no existe');
    }

    // Verificar traslapes en la nueva habitación
    const overlap = await this.prisma.hotelReservation.findFirst({
      where: {
        hotelRoomId: dto.newRoomId,
        status: { notIn: ['CANCELLED', 'CHECKED_OUT', 'NO_SHOW'] },
        checkInDate: { lt: reservation.checkOutDate },
        checkOutDate: { gt: reservation.checkInDate },
        id: { not: id },
      },
    });

    if (overlap) {
      throw new ConflictException('La habitación de destino no está disponible para las fechas de esta reserva');
    }

    return this.prisma.$transaction(async (tx) => {
      const oldRoomId = reservation.hotelRoomId;
      const wasCheckedIn = reservation.status === ReservationStatus.CHECKED_IN;

      // Liberar habitación origen
      if (wasCheckedIn) {
        await tx.hotelRoom.update({
          where: { id: oldRoomId },
          data: { status: HotelRoomStatus.CLEANING },
        });
        // Ocupar habitación destino
        await tx.hotelRoom.update({
          where: { id: dto.newRoomId },
          data: { status: HotelRoomStatus.OCCUPIED },
        });
      }

      // Recalcular con la nueva tarifa si es diferente
      const nights = this.calculateNights(
        new Date(reservation.checkInDate),
        new Date(reservation.checkOutDate),
      );
      const newNightlyRate = Number(newRoom.pricePerNight || reservation.nightlyRate || 0);
      const newTotal = nights * newNightlyRate;

      return tx.hotelReservation.update({
        where: { id },
        data: {
          hotelRoomId: dto.newRoomId,
          nightlyRate: newNightlyRate,
          totalAmount: newTotal,
          notes: reservation.notes
            ? `${reservation.notes} | Cambio a hab. ${newRoom.roomNumber}: ${dto.reason || ''}`.trim()
            : `Cambio a hab. ${newRoom.roomNumber}: ${dto.reason || ''}`.trim(),
        },
        include: { customer: true, hotelRoom: true, charges: true },
      });
    });
  }

  // ── FASE 6B: Extensión de Estadía ──────────────────────────────────
  async extendStay(id: string, dto: ExtendStayDto) {
    const reservation = await this.findOne(id, dto.organizationId);

    if (reservation.status !== ReservationStatus.CHECKED_IN && reservation.status !== ReservationStatus.CONFIRMED) {
      throw new ConflictException('Solo se puede extender estadías en reservas CONFIRMED o CHECKED_IN');
    }

    const newCheckOutDate = this.parseLocalDate(dto.newCheckOutDate);
    const currentCheckOut = new Date(reservation.checkOutDate);

    if (newCheckOutDate <= currentCheckOut) {
      throw new BadRequestException('La nueva fecha de check-out debe ser posterior a la fecha actual de salida');
    }

    // Verificar traslapes en la misma habitación con la nueva fecha
    const overlap = await this.prisma.hotelReservation.findFirst({
      where: {
        hotelRoomId: reservation.hotelRoomId,
        status: { notIn: ['CANCELLED', 'CHECKED_OUT', 'NO_SHOW'] },
        checkInDate: { lt: newCheckOutDate },
        checkOutDate: { gt: currentCheckOut },
        id: { not: id },
      },
    });

    if (overlap) {
      throw new ConflictException('Hay otra reserva que impide extender a esa fecha');
    }

    const nights = this.calculateNights(new Date(reservation.checkInDate), newCheckOutDate);
    const nightlyRate = Number(reservation.nightlyRate || reservation.hotelRoom.pricePerNight || 0);
    const newTotal = nights * nightlyRate;

    return this.prisma.hotelReservation.update({
      where: { id },
      data: {
        checkOutDate: newCheckOutDate,
        totalAmount: newTotal,
        notes: dto.notes
          ? `${reservation.notes || ''} | Extensión: ${dto.notes}`.trim()
          : reservation.notes,
      },
      include: { customer: true, hotelRoom: true, charges: true },
    });
  }

  // ── FASE 6C: No-Show ────────────────────────────────────────────────
  async markAsNoShow(id: string, organizationId: string) {
    const reservation = await this.findOne(id, organizationId);

    if (reservation.status !== ReservationStatus.CONFIRMED && reservation.status !== ReservationStatus.PENDING) {
      throw new ConflictException('Solo se puede marcar como No-Show reservas CONFIRMED o PENDING');
    }

    return this.prisma.hotelReservation.update({
      where: { id },
      data: {
        status: ReservationStatus.NO_SHOW,
        cancellationReason: 'El huésped no se presentó (No-Show)',
      },
      include: { customer: true, hotelRoom: true },
    });
  }

  // ── FASE 7B: Reporte de Ocupación e Ingresos ────────────────────────
  async getOccupancyReport(organizationId: string, branchId?: string, from?: string, to?: string) {
    const fromDate = from ? this.parseLocalDate(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const toDate = to
      ? new Date(new Date(this.parseLocalDate(to)).setHours(23, 59, 59, 999))
      : new Date();

    const reservations = await this.prisma.hotelReservation.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
        checkInDate: { gte: fromDate },
        checkOutDate: { lte: toDate },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
      },
      include: {
        hotelRoom: true,
        customer: true,
        charges: true,
      },
      orderBy: { checkInDate: 'asc' },
    });

    const rooms = await this.prisma.hotelRoom.findMany({
      where: {
        organizationId,
        ...(branchId ? { branchId } : {}),
      },
    });

    const totalRooms = rooms.length;
    const days = Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)));
    const totalRoomNights = totalRooms * days;

    let totalRevenue = 0;
    let totalNightsOccupied = 0;
    const byRoom: Record<string, any> = {};
    const byRoomType: Record<string, any> = {};

    for (const r of reservations) {
      const nights = this.calculateNights(new Date(r.checkInDate), new Date(r.checkOutDate));
      const roomRevenue = Number(r.totalAmount || 0);
      const chargesRevenue = r.charges.reduce((sum: number, c: any) => sum + Number(c.amount) * c.quantity, 0);
      const revenue = roomRevenue + chargesRevenue;

      totalRevenue += revenue;
      totalNightsOccupied += nights;

      // Por habitación
      if (!byRoom[r.hotelRoomId]) {
        byRoom[r.hotelRoomId] = {
          roomNumber: r.hotelRoom.roomNumber,
          roomType: r.hotelRoom.roomType,
          reservations: 0,
          nights: 0,
          revenue: 0,
        };
      }
      byRoom[r.hotelRoomId].reservations++;
      byRoom[r.hotelRoomId].nights += nights;
      byRoom[r.hotelRoomId].revenue += revenue;

      // Por tipo
      const rt = r.hotelRoom.roomType;
      if (!byRoomType[rt]) {
        byRoomType[rt] = { reservations: 0, nights: 0, revenue: 0 };
      }
      byRoomType[rt].reservations++;
      byRoomType[rt].nights += nights;
      byRoomType[rt].revenue += revenue;
    }

    const occupancyRate = totalRoomNights > 0 ? (totalNightsOccupied / totalRoomNights) * 100 : 0;
    const revPAR = totalRooms > 0 ? totalRevenue / (totalRooms * days) : 0;
    const adr = totalNightsOccupied > 0 ? totalRevenue / totalNightsOccupied : 0;

    return {
      period: { from: fromDate, to: toDate, days },
      summary: {
        totalRooms,
        totalReservations: reservations.length,
        totalNightsOccupied,
        totalRevenue,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        revPAR: Math.round(revPAR * 100) / 100,
        adr: Math.round(adr * 100) / 100,
      },
      byRoom: Object.values(byRoom).sort((a: any, b: any) => b.revenue - a.revenue),
      byRoomType: Object.entries(byRoomType).map(([type, data]) => ({ type, ...(data as any) })),
      reservations,
    };
  }

  // --- GESTIÓN DE CARGOS Y CONSUMOS EXTRA ---
  async addCharge(reservationId: string, dto: CreateHotelRoomChargeDto) {
    const reservation = await this.findOne(reservationId, dto.organizationId);

    if (reservation.status === ReservationStatus.CHECKED_OUT || reservation.status === ReservationStatus.CANCELLED) {
      throw new ConflictException('No se pueden añadir cargos a una reserva finalizada o cancelada');
    }

    return this.prisma.hotelRoomCharge.create({
      data: {
        organizationId: dto.organizationId,
        reservationId,
        description: dto.description,
        amount: dto.amount,
        quantity: dto.quantity || 1,
        productId: dto.productId,
      },
    });
  }

  async getCharges(reservationId: string, organizationId: string) {
    await this.findOne(reservationId, organizationId);
    return this.prisma.hotelRoomCharge.findMany({
      where: { reservationId, organizationId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeCharge(chargeId: string, organizationId: string) {
    const charge = await this.prisma.hotelRoomCharge.findFirst({
      where: { id: chargeId, organizationId },
    });

    if (!charge) {
      throw new NotFoundException('Cargo no encontrado');
    }

    return this.prisma.hotelRoomCharge.delete({
      where: { id: chargeId },
    });
  }

  // =========================================================================
  // PORTAL PÚBLICO DE RESERVAS DE HOTEL (SIN AUTENTICACIÓN)
  // =========================================================================

  private async resolveOrganizationBySlugOrId(slugOrId: string) {
    const org = await this.prisma.organization.findFirst({
      where: {
        isActive: true,
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
    });

    if (!org) {
      throw new NotFoundException('Hotel u organización no encontrada');
    }

    return org;
  }

  async getPublicHotelCatalog(
    slugOrId: string,
    checkInStr?: string,
    checkOutStr?: string,
    guestsStr?: string,
  ) {
    const org = await this.resolveOrganizationBySlugOrId(slugOrId);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const defaultCheckIn = today.toISOString().split('T')[0];
    const defaultCheckOut = tomorrow.toISOString().split('T')[0];

    const checkInDateStr = checkInStr || defaultCheckIn;
    const checkOutDateStr = checkOutStr || defaultCheckOut;
    const guests = Math.max(1, Number(guestsStr || 1));

    const checkInDate = this.parseLocalDate(checkInDateStr);
    let checkOutDate = this.parseLocalDate(checkOutDateStr);
    if (checkOutDate <= checkInDate) {
      checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkInDate.getDate() + 1);
    }

    const nights = this.calculateNights(checkInDate, checkOutDate);

    const [branches, rooms, overlappingReservations] = await Promise.all([
      this.prisma.branch.findMany({
        where: { organizationId: org.id, isActive: true },
        select: { id: true, name: true, address: true, city: true, phoneNumber: true },
      }),
      this.prisma.hotelRoom.findMany({
        where: {
          organizationId: org.id,
          status: { notIn: [HotelRoomStatus.OUT_OF_ORDER, HotelRoomStatus.MAINTENANCE] },
        },
        include: {
          branch: { select: { id: true, name: true, city: true, address: true, phoneNumber: true } },
        },
        orderBy: [{ pricePerNight: 'asc' }, { roomNumber: 'asc' }],
      }),
      this.prisma.hotelReservation.findMany({
        where: {
          organizationId: org.id,
          status: { notIn: [ReservationStatus.CANCELLED, ReservationStatus.CHECKED_OUT, ReservationStatus.NO_SHOW] },
          checkInDate: { lt: checkOutDate },
          checkOutDate: { gt: checkInDate },
        },
        select: { hotelRoomId: true, status: true },
      }),
    ]);

    const busyRoomIds = new Set(overlappingReservations.map((r) => r.hotelRoomId));

    const enrichedRooms = rooms.map((room) => {
      const isDateAvailable = !busyRoomIds.has(room.id);
      const meetsCapacity = Number(room.capacity || 1) >= guests;
      const nightlyRate = Number(room.pricePerNight || 0);
      return {
        ...room,
        nightlyRate,
        nights,
        estimatedTotal: nights * nightlyRate,
        isDateAvailable,
        meetsCapacity,
        canBook: isDateAvailable && meetsCapacity,
      };
    });

    return {
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        country: org.country,
        timezone: org.timezone,
      },
      branches,
      rooms: enrichedRooms,
      search: {
        checkInDate: checkInDateStr,
        checkOutDate: checkOutDate.toISOString().split('T')[0],
        guests,
        nights,
      },
    };
  }

  async getPublicGuestStatus(slugOrId: string, identifier: string) {
    const cleanId = (identifier || '').trim();
    if (!cleanId) {
      throw new BadRequestException('Ingresa tu número de documento, pasaporte, celular o correo electrónico');
    }

    const org = await this.resolveOrganizationBySlugOrId(slugOrId);

    const customer = await this.prisma.customer.findFirst({
      where: {
        organizationId: org.id,
        isActive: true,
        OR: [
          { identificationNumber: { equals: cleanId, mode: 'insensitive' } },
          { email: { equals: cleanId, mode: 'insensitive' } },
          { phoneNumber: { equals: cleanId } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        identificationType: true,
        identificationNumber: true,
        email: true,
        phoneNumber: true,
        medicalAlerts: true,
        loyaltyPoints: true,
        notes: true,
      },
    });

    if (!customer) {
      throw new NotFoundException(
        'No encontramos un huésped registrado con ese documento o correo. Puedes registrarte directamente al reservar tu habitación.',
      );
    }

    const reservations = await this.prisma.hotelReservation.findMany({
      where: {
        organizationId: org.id,
        customerId: customer.id,
      },
      include: {
        hotelRoom: {
          include: {
            branch: { select: { id: true, name: true, city: true, address: true, phoneNumber: true } },
          },
        },
        charges: true,
      },
      orderBy: { checkInDate: 'desc' },
    });

    return {
      customer,
      reservations,
    };
  }

  async createPublicReservation(
    slugOrId: string,
    payload: {
      hotelRoomId: string;
      checkInDate: string;
      checkOutDate: string;
      guests?: number;
      customerId?: string;
      firstName?: string;
      lastName?: string;
      identificationType?: string;
      identificationNumber?: string;
      email?: string;
      phoneNumber?: string;
      paymentMethod?: string;
      paymentReference?: string;
      notes?: string;
    },
  ) {
    const org = await this.resolveOrganizationBySlugOrId(slugOrId);

    if (!payload.hotelRoomId || !payload.checkInDate || !payload.checkOutDate) {
      throw new BadRequestException('Habitación, fecha de entrada y fecha de salida son obligatorias');
    }

    const checkInDate = this.parseLocalDate(payload.checkInDate);
    const checkOutDate = this.parseLocalDate(payload.checkOutDate);

    if (checkInDate >= checkOutDate) {
      throw new BadRequestException('La fecha de salida (check-out) debe ser posterior a la de entrada (check-in)');
    }

    const room = await this.prisma.hotelRoom.findFirst({
      where: {
        id: payload.hotelRoomId,
        organizationId: org.id,
      },
    });

    if (!room) {
      throw new NotFoundException('La habitación seleccionada no existe');
    }

    const overlapping = await this.prisma.hotelReservation.findFirst({
      where: {
        hotelRoomId: room.id,
        status: { notIn: [ReservationStatus.CANCELLED, ReservationStatus.CHECKED_OUT, ReservationStatus.NO_SHOW] },
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
      },
    });

    if (overlapping) {
      throw new ConflictException('Esta habitación ya fue reservada para las fechas seleccionadas. Por favor elige otra habitación o fechas.');
    }

    // Resolver o crear el Huésped (Customer Core)
    let customerId = payload.customerId;
    if (!customerId) {
      const idNumber = (payload.identificationNumber || '').trim();
      const email = (payload.email || '').trim().toLowerCase();
      const firstName = (payload.firstName || '').trim();
      const lastName = (payload.lastName || '').trim();
      const phoneNumber = (payload.phoneNumber || '').trim();

      if (!idNumber || !firstName) {
        throw new BadRequestException('Ingresa tu nombre y número de documento/pasaporte para completar la reserva');
      }

      const existingCustomer = await this.prisma.customer.findFirst({
        where: {
          organizationId: org.id,
          OR: [
            { identificationNumber: { equals: idNumber, mode: 'insensitive' } },
            ...(email ? [{ email: { equals: email, mode: 'insensitive' as const } }] : []),
          ],
        },
      });

      if (existingCustomer) {
        const updated = await this.prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            firstName: firstName || existingCustomer.firstName,
            lastName: lastName || existingCustomer.lastName,
            phoneNumber: phoneNumber || existingCustomer.phoneNumber,
            email: email || existingCustomer.email,
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

    const nights = this.calculateNights(checkInDate, checkOutDate);
    const nightlyRate = Number(room.pricePerNight || 0);
    const totalAmount = nights * nightlyRate;

    const noteParts: string[] = ['[Reserva Online Portal Huésped]'];
    if (payload.guests) noteParts.push(`Huéspedes: ${payload.guests}`);
    if (payload.paymentMethod) noteParts.push(`Medio de pago preferido: ${payload.paymentMethod}`);
    if (payload.paymentReference) noteParts.push(`Ref/Comprobante: ${payload.paymentReference}`);
    if (payload.notes) noteParts.push(`Solicitudes: ${payload.notes}`);

    return this.prisma.hotelReservation.create({
      data: {
        organizationId: org.id,
        branchId: room.branchId,
        customerId,
        hotelRoomId: room.id,
        checkInDate,
        checkOutDate,
        nightlyRate,
        totalAmount,
        notes: noteParts.join(' | '),
        status: ReservationStatus.PENDING,
      },
      include: {
        customer: true,
        hotelRoom: true,
        charges: true,
      },
    });
  }

  async cancelPublicReservation(
    slugOrId: string,
    reservationId: string,
    customerId: string,
    reason?: string,
  ) {
    const org = await this.resolveOrganizationBySlugOrId(slugOrId);

    const reservation = await this.prisma.hotelReservation.findFirst({
      where: {
        id: reservationId,
        organizationId: org.id,
        customerId,
      },
      include: { hotelRoom: true },
    });

    if (!reservation) {
      throw new NotFoundException('No se encontró la reserva para este huésped');
    }

    if (reservation.status !== ReservationStatus.PENDING && reservation.status !== ReservationStatus.CONFIRMED) {
      throw new ConflictException('Solo puedes cancelar reservas que aún no hayan iniciado Check-In');
    }

    return this.prisma.hotelReservation.update({
      where: { id: reservation.id },
      data: {
        status: ReservationStatus.CANCELLED,
        cancellationReason: reason || 'Cancelada por el huésped desde el Portal Público',
      },
      include: { customer: true, hotelRoom: true },
    });
  }
}
