import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateCashSessionDto } from './dto/create-cash-session.dto';
import { UpdateCashSessionDto } from './dto/update-cash-session.dto';

@Injectable()
export class CashSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async open(dto: CreateCashSessionDto) {
    const active = await this.prisma.cashSession.findFirst({
      where: { userId: dto.userId, status: 'OPEN' },
    });
    if (active) throw new ConflictException('You already have an active open cash session');

    return this.prisma.cashSession.create({
      data: {
        organizationId: dto.organizationId,
        branchId: dto.branchId,
        userId: dto.userId,
        openingBalance: dto.openingBalance,
        expectedBalance: dto.openingBalance,
        status: 'OPEN',
      },
    });
  }

  async findActiveSession(userId: string) {
    return this.prisma.cashSession.findFirst({
      where: { userId, status: 'OPEN' },
    });
  }

  // --- MOTOR DE ARQUEO SEMÁNTICO ACUPLADO A TU PRISMA (KNA-068) ---
  async close(id: string, dto: UpdateCashSessionDto) {
    const session = await this.prisma.cashSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Cash session not found');
    if (session.status !== 'OPEN') throw new ConflictException('This session is already closed');

    // Forzar lectura numérica segura del balance reportado por el DTO
    const actualBalanceNum = dto.actualBalance ? Number(dto.actualBalance) : 0;

    // 1. Acumular todas las transacciones en efectivo ingresadas en la sucursal desde la apertura del turno
    const payments = await this.prisma.payment.findMany({
      where: {
        sale: { branchId: session.branchId }, // Filtro relacional plano exacto
        method: 'CASH',
        createdAt: { gte: session.openingDate },
      },
    });

    const totalCashSales = payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const expectedFinalBalance = Number(session.openingBalance) + totalCashSales;

    // 2. Cómputo del descuadre financiero
    const difference = actualBalanceNum - expectedFinalBalance;

    return this.prisma.cashSession.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closingDate: new Date(),
        expectedBalance: expectedFinalBalance,
        actualBalance: actualBalanceNum,
        difference,
        notes: dto.notes || undefined,
      },
    });
  }
}
