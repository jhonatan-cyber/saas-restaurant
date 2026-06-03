import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Prisma, AuditAction, OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CashFoundationService } from '../cash-foundation/cash-foundation.service';
import type { CreatePaymentsDto, PaymentItemDto } from './dto/payment.dto';

/**
 * PaymentsService (FASE 4).
 *
 * Procesa pagos de una orden. Soporta:
 *  - Pagos mixtos (varios PaymentItemDto con métodos distintos).
 *  - Efectivo: calcula change (tendered - amount) si no viene explícito.
 *  - QR/Transferencia: requiere reference.
 *
 * Reglas:
 *  - La orden debe existir y pertenecer al tenant.
 *  - La orden debe estar en estado "cobrable": DELIVERED o superior (no PAID ya).
 *  - Σ(payments.amount) DEBE ser EXACTAMENTE = order.total (no overpay, no underpay en F4).
 *  - El cajero debe tener un shift OPEN en la sucursal de la orden.
 *  - Todo se hace en una tx: payments + Order.status=PAID + OrderStateLog + audit.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cashFoundation: CashFoundationService,
  ) {}

  /**
   * Crea los pagos de una orden, la marca como PAID, y registra el state log.
   * Devuelve el Order actualizado.
   */
  async payOrder(params: {
    businessId: string;
    userId: string;
    orderId: string;
    dto: CreatePaymentsDto;
  }): Promise<{
    order: {
      id: string;
      status: OrderStatus;
      total: string;
      paidAt: Date;
      payments: Array<{
        id: string;
        method: string;
        amount: string;
        tendered: string | null;
        change: string | null;
        reference: string | null;
      }>;
    };
  }> {
    // 1. Validaciones previas (fuera de tx, más claras)
    const order = await this.prisma.order.findFirst({
      where: { id: params.orderId, businessId: params.businessId },
      include: { payments: true },
    });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }
    if (order.status === 'PAID') {
      throw new ConflictException('La orden ya está pagada');
    }
    if (order.status === 'CANCELLED' || order.status === 'DRAFT') {
      throw new BadRequestException(
        `No se puede cobrar una orden en estado ${order.status}`,
      );
    }
    if (order.status !== 'DELIVERED') {
      throw new BadRequestException(
        `La orden debe estar en DELIVERED para cobrar (actual: ${order.status}). ` +
          'Avanzá el estado primero.',
      );
    }

    // 2. Validar pagos individualmente + suma total
    const orderTotal = new Prisma.Decimal(order.total);
    const sumAmount = params.dto.payments.reduce(
      (acc, p) => acc.plus(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0),
    );
    if (!sumAmount.equals(orderTotal)) {
      throw new BadRequestException(
        `La suma de pagos (${sumAmount.toString()}) no coincide con el total de la orden (${orderTotal.toString()}). ` +
          'Para mixto, ajustá los montos.',
      );
    }
    for (const p of params.dto.payments) {
      this.validatePaymentItem(p);
    }

    // 3. Resolver shift del cajero
    const session = await this.cashFoundation.findOpenCashAndShift(order.branchId);
    if (!session) {
      throw new BadRequestException(
        'No hay caja/turno abierto en esta sucursal. Abrí turno antes de cobrar.',
      );
    }

    // 4. Transacción
    return this.prisma.$transaction(async (tx) => {
      const createdPayments: Array<{
        id: string;
        method: string;
        amount: string;
        tendered: string | null;
        change: string | null;
        reference: string | null;
      }> = [];

      for (const p of params.dto.payments) {
        // CASH: calcular change si no viene
        let tendered: Prisma.Decimal | null = null;
        let change: Prisma.Decimal | null = null;
        if (p.method === 'CASH') {
          const amt = new Prisma.Decimal(p.amount);
          const tend = p.tendered !== undefined ? new Prisma.Decimal(p.tendered) : amt;
          if (tend.lessThan(amt)) {
            throw new BadRequestException(
              'Efectivo entregado es menor al monto del pago',
            );
          }
          tendered = tend;
          change = p.change !== undefined
            ? new Prisma.Decimal(p.change)
            : tend.minus(amt);
        }

        const created = await tx.payment.create({
          data: {
            businessId: params.businessId,
            orderId: order.id,
            method: p.method,
            amount: new Prisma.Decimal(p.amount),
            tendered: tendered,
            change: change,
            reference: p.reference ?? null,
            cashierId: params.userId,
          },
        });

        await this.audit.log(
          {
            businessId: params.businessId,
            userId: params.userId,
            action: AuditAction.PAYMENT,
            entity: 'Payment',
            entityId: created.id,
            after: {
              orderId: order.id,
              method: created.method,
              amount: created.amount.toString(),
              tendered: created.tendered?.toString() ?? null,
              change: created.change?.toString() ?? null,
              reference: created.reference,
            },
          },
          tx,
        );

        createdPayments.push({
          id: created.id,
          method: created.method,
          amount: created.amount.toString(),
          tendered: created.tendered?.toString() ?? null,
          change: created.change?.toString() ?? null,
          reference: created.reference,
        });
      }

      // 5. Transicionar order a PAID
      const previousStatus = order.status;
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          version: { increment: 1 },
        },
      });

      await tx.orderStateLog.create({
        data: {
          businessId: params.businessId,
          orderId: order.id,
          fromStatus: previousStatus,
          toStatus: 'PAID',
          changedByUserId: params.userId,
          reason: `Pagado: ${createdPayments.length} pago(s), total ${orderTotal.toString()}`,
          metadata: {
            paymentIds: createdPayments.map((p) => p.id),
            paymentMethods: createdPayments.map((p) => p.method),
          },
        },
      });

      return {
        order: {
          id: updated.id,
          status: updated.status,
          total: updated.total.toString(),
          paidAt: updated.updatedAt,
          payments: createdPayments,
        },
      };
    });
  }

  /**
   * Lista los pagos de una orden.
   */
  async listForOrder(params: {
    businessId: string;
    orderId: string;
  }): Promise<Array<{
    id: string;
    method: string;
    amount: string;
    tendered: string | null;
    change: string | null;
    reference: string | null;
    cashierId: string;
    createdAt: Date;
  }>> {
    const order = await this.prisma.order.findFirst({
      where: { id: params.orderId, businessId: params.businessId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Orden no encontrada');

    const payments = await this.prisma.payment.findMany({
      where: { businessId: params.businessId, orderId: order.id },
      orderBy: { createdAt: 'asc' },
    });
    return payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: p.amount.toString(),
      tendered: p.tendered?.toString() ?? null,
      change: p.change?.toString() ?? null,
      reference: p.reference,
      cashierId: p.cashierId,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Calcula el cambio para un pago en efectivo sin guardar.
   * Endpoint de preview para el modal de pago.
   */
  previewChange(total: string, tendered: string): {
    change: string;
    tendered: string;
    sufficient: boolean;
  } {
    const t = new Prisma.Decimal(tendered);
    const tot = new Prisma.Decimal(total);
    const change = t.minus(tot);
    return {
      change: change.isNegative() ? '0.00' : change.toString(),
      tendered: t.toString(),
      sufficient: !change.isNegative(),
    };
  }

  // ============== Helpers ==============

  private validatePaymentItem(p: PaymentItemDto): void {
    switch (p.method) {
      case 'CASH':
        // tendered/change son opcionales (se calculan si no vienen)
        break;
      case 'QR':
      case 'TRANSFER':
      case 'CARD':
        if (!p.reference) {
          throw new BadRequestException(
            `Pago con ${p.method} requiere el campo "reference" (número de comprobante)`,
          );
        }
        break;
    }
  }
}
