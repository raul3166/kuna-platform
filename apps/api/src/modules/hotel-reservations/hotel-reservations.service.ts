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

    // 1. Validar que la habitación exista
    const room = await this.prisma.hotelRoom.findFirst({
      where: { id: dto.hotelRoomId, organizationId: dto.organizationId },
    });

    if (!room) {
      throw new NotFoundException('La habitación seleccionada no existe');
    }

    // 2. Lógica de traslape de fechas
    const overlappingReservation = await this.prisma.hotelReservation.findFirst({
      where: {
        hotelRoomId: dto.hotelRoomId,
        status: { notIn: ['CANCELLED', 'CHECKED_OUT'] },
        checkInDate: { lt: checkOutDate },
        checkOutDate: { gt: checkInDate },
      },
    });

    if (overlappingReservation) {
      throw new ConflictException('La habitación no está disponible durante las fechas seleccionadas');
    }

    // 3. Tarifas y noches
    const nights = this.calculateNights(checkInDate, checkOutDate);
    const nightlyRate = dto.nightlyRate !== undefined ? Number(dto.nightlyRate) : Number(room.pricePerNight || 0);
    const totalAmount = dto.totalAmount !== undefined ? Number(dto.totalAmount) : nights * nightlyRate;

    // 4. Crear reserva
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

    if (reservation.status === ReservationStatus.CANCELLED || reservation.status === ReservationStatus.CHECKED_OUT) {
      throw new ConflictException(`No se puede realizar Check-In en una reserva ${reservation.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar reserva a CHECKED_IN
      const updatedReservation = await tx.hotelReservation.update({
        where: { id },
        data: { status: ReservationStatus.CHECKED_IN },
        include: { customer: true, hotelRoom: true, charges: true },
      });

      // 2. Actualizar habitación a OCCUPIED
      await tx.hotelRoom.update({
        where: { id: reservation.hotelRoomId },
        data: { status: HotelRoomStatus.OCCUPIED },
      });

      return updatedReservation;
    });
  }

  async checkOut(id: string, organizationId: string, dto: CheckOutReservationDto) {
    const reservation = await this.findOne(id, organizationId);

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

      // Ítems para la factura
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

      // Obtener resolución de facturación si existe
      const resolution = await tx.billingResolution.findFirst({
        where: { branchId: reservation.branchId, organizationId, isActive: true },
      });

      let saleNumber = `HOTEL-${Date.now()}`;
      if (resolution && resolution.currentNumber <= resolution.toNumber && new Date() <= new Date(resolution.expiryDate)) {
        saleNumber = `${resolution.prefix}-${resolution.currentNumber}`;
        await tx.billingResolution.update({
          where: { id: resolution.id },
          data: { currentNumber: { increment: 1 } },
        });
      }

      const paymentMethod = dto.paymentMethod || PaymentMethod.CASH;

      // Crear la venta
      const sale = await tx.sale.create({
        data: {
          organizationId: reservation.organizationId,
          branchId: reservation.branchId,
          customerId: reservation.customerId,
          saleNumber,
          subtotal: grandTotal,
          total: grandTotal,
          status: SaleStatus.CONFIRMED,
          notes: dto.notes || `Liquidación de Hospedaje - Hab. ${reservation.hotelRoom.roomNumber}`,
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

      // Actualizar reserva a CHECKED_OUT
      const updatedReservation = await tx.hotelReservation.update({
        where: { id },
        data: {
          status: ReservationStatus.CHECKED_OUT,
          saleId: sale.id,
        },
        include: { customer: true, hotelRoom: true, charges: true, sale: true },
      });

      // Actualizar habitación a CLEANING
      await tx.hotelRoom.update({
        where: { id: reservation.hotelRoomId },
        data: { status: HotelRoomStatus.CLEANING },
      });

      return updatedReservation;
    });
  }

  async cancel(id: string, organizationId: string) {
    const reservation = await this.findOne(id, organizationId);

    return this.prisma.$transaction(async (tx) => {
      // Si la habitación estaba ocupada por esta reserva, pasarla a disponible
      if (reservation.status === ReservationStatus.CHECKED_IN) {
        await tx.hotelRoom.update({
          where: { id: reservation.hotelRoomId },
          data: { status: HotelRoomStatus.AVAILABLE },
        });
      }

      return tx.hotelReservation.update({
        where: { id },
        data: { status: ReservationStatus.CANCELLED },
        include: { customer: true, hotelRoom: true },
      });
    });
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
}
