import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

    // --- EVOLUCIÓN SPRINT 9: AUTOCONSEGUTIVOS FISCALES (KNA-060 / KNA-061) ---
  async create(createSaleDto: CreateSaleDto) {
    const { organizationId, branchId, customerId, notes } = createSaleDto;

    // 1. Obtener de forma estricta la resolución fiscal de la sucursal emisora
    const resolution = await this.prisma.billingResolution.findFirst({
      where: { branchId, organizationId, isActive: true },
    });

    if (!resolution) {
      throw new ConflictException('No active billing resolution found for this branch. Cannot issue sales.');
    }

    if (resolution.currentNumber > resolution.toNumber) {
      throw new ConflictException('The billing resolution has run out of authorized invoice numbers.');
    }

    if (new Date() > new Date(resolution.expiryDate)) {
      throw new ConflictException('The branch billing resolution has expired.');
    }

    // 2. Construir de forma semántica el consecutivo oficial (Prefijo + Número)
    const assignedSaleNumber = `${resolution.prefix}-${resolution.currentNumber}`;

    // 3. Crear el registro atómico y avanzar el consecutivo fiscal en una sola transacción
    return this.prisma.$transaction(async (tx) => {
      // Avanzar el contador de la resolución
      await tx.billingResolution.update({
        where: { id: resolution.id },
        data: { currentNumber: { increment: 1 } },
      });

      // Crear la cabecera comercial limpia
      return tx.sale.create({
        data: {
          organizationId,
          branchId,
          customerId,
          saleNumber: assignedSaleNumber, // Asignación inteligente automática
          notes,
          subtotal: 0,
          discount: 0,
          tax: 0,
          total: 0,
        },
        include: {
          branch: { select: { id: true, name: true, code: true } },
          customer: true,
          items: true,
        },
      });
    });
  }


    // --- CORRECCIÓN DE RELACIÓN DE CATÁLOGO EN LISTADO GENERAL (KNA-062) ---
  async findAll(organizationId?: string, status?: string) {
    return this.prisma.sale.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        customer: true,
        // CORREGIDO: Incluir la relación profunda del producto para que viaje el nombre real al frontend
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }


    // --- CORRECCIÓN DEFINITIVA EN EL MOTOR DE CONSULTA INDIVIDUAL ---
  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        customer: true,
        // CORREGIDO: Carga anidada profunda para jalar el nombre real del producto
        items: {
          include: {
            product: true // <-- ¡MANDATORIO! Esto elimina para siempre el texto 'Insumo Comercial'
          }
        }
      },
    });

    if (!sale) throw new NotFoundException('Sale record not found');
    return sale;
  }


  async update(id: string, updateSaleDto: UpdateSaleDto) {
    const sale = await this.prisma.sale.findUnique({ where: { id } });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status !== 'DRAFT') throw new ConflictException('Only DRAFT sales can be modified');

    if (updateSaleDto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: updateSaleDto.branchId, organizationId: sale.organizationId },
      });
      if (!branch) throw new NotFoundException('Branch not found in organization');
    }

    if (updateSaleDto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: updateSaleDto.customerId, organizationId: sale.organizationId },
      });
      if (!customer) throw new NotFoundException('Customer not found in organization');
    }

    if (updateSaleDto.saleNumber && updateSaleDto.saleNumber !== sale.saleNumber) {
      const existingSale = await this.prisma.sale.findFirst({
        where: { organizationId: sale.organizationId, saleNumber: updateSaleDto.saleNumber, NOT: { id } },
      });
      if (existingSale) throw new ConflictException('Sale number already exists in organization');
    }

    return this.prisma.sale.update({
      where: { id },
      data: updateSaleDto,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        customer: true,
        items: true,
      },
    });
  }

  async remove(id: string) {
    const sale = await this.prisma.sale.findUnique({ where: { id } });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status !== 'DRAFT') throw new ConflictException('Only DRAFT sales can be deleted');
    return this.prisma.sale.delete({ where: { id } });
  }

  // --- MANDATORIO SPRINT 9: RECALCULO DE TOTALES (KNA-055) ---
  async recalculateSaleTotals(saleId: string) {
    const items = await this.prisma.saleItem.findMany({
      where: { saleId },
    });

    const subtotalBase = items.reduce((acc, item) => acc + (item.quantity * Number(item.unitPrice)), 0);
    const totalDiscount = items.reduce((acc, item) => acc + Number(item.discount), 0);
    const totalNeto = subtotalBase - totalDiscount;

    return this.prisma.sale.update({
      where: { id: saleId },
      data: {
        subtotal: subtotalBase,
        discount: totalDiscount,
        total: totalNeto,
      },
    });
  }

    // --- MOTOR TRANSACCIONAL DE VENTAS CORREGIDO (KNA-057) ---
  async confirm(id: string) {
    // 1. Consultar la cabecera junto con sus renglones de detalle
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });

    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status !== 'DRAFT') throw new ConflictException('Only DRAFT sales can be confirmed');
    if (!sale.items || sale.items.length === 0) throw new ConflictException('Cannot confirm a sale with empty items');

    // 2. Disparar bloque transaccional ACID en PostgreSQL
    return this.prisma.$transaction(async (tx) => {

      for (const item of sale.items) {
        // Consultar existencias actuales en la tabla BranchProductStock por sucursal
        const stockRecord = await tx.branchProductStock.findFirst({
          where: {
            productId: item.productId,
            branchId: sale.branchId,
          },
        });

        const currentStockNum = stockRecord ? Number(stockRecord.stock) : 0;

        // KNA-061: Validación de Integridad — Prevenir inventarios negativos
        if (currentStockNum < item.quantity) {
          throw new ConflictException(
            `Insufficient stock for product [${item.product.name}]. Available: ${currentStockNum}, Required: ${item.quantity}`
          );
        }

        // 3. Descontar stock atómicamente de la sede emisora
        await tx.branchProductStock.update({
          where: { id: stockRecord!.id },
          data: {
            stock: { decrement: item.quantity },
          },
        });

        // 4. Inyectar traza atómica en el Kardex usando tu enum 'SALE'
        await tx.inventoryMovement.create({
          data: {
            organizationId: sale.organizationId,
            branchId: sale.branchId,
            productId: item.productId,
            movementType: 'SALE', // Tu enum de movimientos
            quantity: item.quantity * -1, // Se registra en negativo por ser egreso
            reference: `VENTA-${sale.saleNumber}`,
            notes: item.description || `Salida automática por concepto de venta POS.`,
          },
        });
      }

      // 5. Sellar el documento a CONFIRMED
      return tx.sale.update({
        where: { id },
        data: { status: 'CONFIRMED' },
        include: { items: true },
      });
    });
  }


  async cancel(id: string) {
    const sale = await this.prisma.sale.findUnique({ where: { id } });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status !== 'DRAFT') throw new ConflictException('Only DRAFT sales can be cancelled');

    return this.prisma.sale.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
}
