import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePaymentDto) {
    const sale = await this.prisma.sale.findUnique({ where: { id: dto.saleId } });
    if (!sale) throw new NotFoundException('Sale record not found');

    // Un candado defensivo: No recibir pagos si la venta fue anulada
    if (sale.status === 'CANCELLED') {
      throw new ConflictException('Cannot register payments for cancelled sales');
    }

    return this.prisma.payment.create({
      data: {
        organizationId: dto.organizationId,
        saleId: dto.saleId,
        method: dto.method,
        amount: dto.amount,
        reference: dto.reference || undefined,
        notes: dto.notes || undefined,
      },
    });
  }

  async findAll() {
    return this.prisma.payment.findMany({ include: { sale: true } });
  }

  async findOne(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { sale: true } });
    if (!payment) throw new NotFoundException('Payment record not found');
    return payment;
  }

  async remove(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment record not found');

    await this.prisma.payment.delete({ where: { id } });
    return { message: 'Payment record voided successfully.' };
  }
}
