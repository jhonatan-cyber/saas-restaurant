import { Injectable, ConflictException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Prisma, AuditAction, CashRegisterStatus, ShiftStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * CashService (FASE 4: completo).
 *
 * Maneja el ciclo de vida de Cajas y Turnos:
 *  - CashRegister: una "caja física" por sucursal (1 principal, N opcionales).
 *  - Shift: un turno de trabajo de un cajero. Tiene OPEN/CLOSED.
 *  - Arqueo: al cerrar, calcula expectedAmount y graba difference.
 *
 * Reglas de negocio (D5, D6, D11 del plan):
 *  - Solo puede haber 1 shift OPEN por (cashRegister, user).
 *  - expectedAmount = opening + Σ(CASH payments del shift) + Σ(CASH_IN) - Σ(CASH_OUT).
 *  - Si difference ≠ 0 al cerrar, se permite (no bloqueamos) y se audita.
 *  - Si hay órdenes activas (no PAID/CANCELLED) al cerrar, se permite pero
 *    se loggea warning y se atribuyen al siguiente shift.
 */
@Injectable()
export class CashService {
  private readonly logger = new Logger(CashService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ============== Cash Registers ==============

  async listCashRegisters(filters: {
    businessId: string;
    branchId?: string;
  }): Promise<Array<{
    id: string;
    businessId: string;
    branchId: string;
    code: string;
    status: CashRegisterStatus;
    openedAt: Date;
    closedAt: Date | null;
    openedByUserId: string;
    closedByUserId: string | null;
  }>> {
    return this.prisma.cashRegister.findMany({
      where: {
        businessId: filters.businessId,
        ...(filters.branchId && { branchId: filters.branchId }),
      },
      orderBy: [{ branchId: 'asc' }, { code: 'asc' }],
    });
  }

  async createCashRegister(params: {
    businessId: string;
    branchId: string;
    code: string;
    userId: string;
  }): Promise<{ id: string; code: string; status: CashRegisterStatus }> {
    const register = await this.prisma.cashRegister.create({
      data: {
        businessId: params.businessId,
        branchId: params.branchId,
        code: params.code,
        status: 'OPEN',
        openedByUserId: params.userId,
      },
    });
    await this.audit.log({
      businessId: params.businessId,
      userId: params.userId,
      action: AuditAction.CREATE,
      entity: 'CashRegister',
      entityId: register.id,
      after: { id: register.id, code: register.code, branchId: params.branchId, status: 'OPEN' },
    });
    return { id: register.id, code: register.code, status: register.status };
  }

  // ============== Shifts ==============

  /**
   * Abre un turno. Valida que no haya otro shift OPEN para el mismo
   * (cashRegister, user). Si lo hay, lanza 409.
   */
  async openShift(params: {
    businessId: string;
    branchId: string;
    cashRegisterId: string;
    userId: string;
    openingAmount: number;
  }): Promise<{
    id: string;
    cashRegisterId: string;
    userId: string;
    status: ShiftStatus;
    openedAt: Date;
    openingAmount: string;
  }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validar caja
      const register = await tx.cashRegister.findFirst({
        where: { id: params.cashRegisterId, businessId: params.businessId },
      });
      if (!register) {
        throw new NotFoundException('Caja no encontrada');
      }
      if (register.branchId !== params.branchId) {
        throw new BadRequestException('La caja no pertenece a la sucursal del usuario');
      }
      if (register.status === 'CLOSED') {
        throw new BadRequestException('La caja está cerrada. No se pueden abrir turnos.');
      }

      // 2. Validar no haya shift OPEN del mismo (cajero, caja)
      const existing = await tx.shift.findFirst({
        where: {
          cashRegisterId: params.cashRegisterId,
          userId: params.userId,
          status: 'OPEN',
        },
      });
      if (existing) {
        throw new ConflictException(
          `Ya tenés un turno abierto (${existing.id}) en esta caja. Cerralo antes de abrir otro.`,
        );
      }

      // 3. Crear shift
      const shift = await tx.shift.create({
        data: {
          businessId: params.businessId,
          branchId: params.branchId,
          cashRegisterId: params.cashRegisterId,
          userId: params.userId,
          openingAmount: new Prisma.Decimal(params.openingAmount),
        },
      });

      // 4. Audit
      await this.audit.log(
        {
          businessId: params.businessId,
          userId: params.userId,
          action: AuditAction.SHIFT_OPEN,
          entity: 'Shift',
          entityId: shift.id,
          after: {
            cashRegisterId: params.cashRegisterId,
            openingAmount: params.openingAmount,
          },
        },
        tx,
      );

      return {
        id: shift.id,
        cashRegisterId: shift.cashRegisterId,
        userId: shift.userId,
        status: shift.status,
        openedAt: shift.openedAt,
        openingAmount: shift.openingAmount.toString(),
      };
    });
  }

  /**
   * Devuelve el shift OPEN del usuario en una sucursal, o null.
   */
  async getOpenShift(params: {
    businessId: string;
    userId: string;
    branchId: string;
  }): Promise<{
    id: string;
    cashRegisterId: string;
    openedAt: Date;
    openingAmount: string;
  } | null> {
    const shift = await this.prisma.shift.findFirst({
      where: {
        businessId: params.businessId,
        userId: params.userId,
        branchId: params.branchId,
        status: 'OPEN',
      },
      orderBy: { openedAt: 'desc' },
    });
    if (!shift) return null;
    return {
      id: shift.id,
      cashRegisterId: shift.cashRegisterId,
      openedAt: shift.openedAt,
      openingAmount: shift.openingAmount.toString(),
    };
  }

  /**
   * Calcula el expectedAmount SIN cerrar. Útil para "preview" del arqueo.
   * expected = opening + Σ(CASH payments del shift) + Σ(CASH_IN) - Σ(CASH_OUT).
   */
  async computeArqueo(params: {
    businessId: string;
    shiftId: string;
  }): Promise<{
    openingAmount: string;
    cashPaymentsTotal: string;
    cashMovementsInTotal: string;
    cashMovementsOutTotal: string;
    expectedAmount: string;
  }> {
    const shift = await this.prisma.shift.findFirst({
      where: { id: params.shiftId, businessId: params.businessId, status: 'OPEN' },
    });
    if (!shift) {
      throw new NotFoundException('Turno no encontrado o ya cerrado');
    }

    const fromTime = shift.openedAt;

    // CASH payments del shift (vía Order.shiftId)
    const cashPayments = await this.prisma.payment.aggregate({
      where: {
        businessId: params.businessId,
        method: 'CASH',
        order: { shiftId: shift.id },
      },
      _sum: { amount: true },
    });

    // Cash movements del shift
    const [cashIn, cashOut] = await Promise.all([
      this.prisma.cashMovement.aggregate({
        where: { shiftId: shift.id, type: 'CASH_IN' },
        _sum: { amount: true },
      }),
      this.prisma.cashMovement.aggregate({
        where: { shiftId: shift.id, type: 'CASH_OUT' },
        _sum: { amount: true },
      }),
    ]);

    const opening = new Prisma.Decimal(shift.openingAmount);
    const payments = new Prisma.Decimal(cashPayments._sum.amount ?? 0);
    const movsIn = new Prisma.Decimal(cashIn._sum.amount ?? 0);
    const movsOut = new Prisma.Decimal(cashOut._sum.amount ?? 0);
    const expected = opening.plus(payments).plus(movsIn).minus(movsOut);

    return {
      openingAmount: opening.toString(),
      cashPaymentsTotal: payments.toString(),
      cashMovementsInTotal: movsIn.toString(),
      cashMovementsOutTotal: movsOut.toString(),
      expectedAmount: expected.toString(),
    };
  }

  /**
   * Cierra el turno. Calcula expected y difference, los persiste.
   * Si difference ≠ 0, no bloqueamos (operativo: faltantes/sobrantes
   * ocurren). Audita con metadata.
   */
  async closeShift(params: {
    businessId: string;
    shiftId: string;
    userId: string;
    closingAmount: number;
    closingNotes?: string;
  }): Promise<{
    id: string;
    status: ShiftStatus;
    openedAt: Date;
    closedAt: Date;
    openingAmount: string;
    closingAmount: string;
    expectedAmount: string;
    difference: string;
    cashPaymentsTotal: string;
    cashMovementsInTotal: string;
    cashMovementsOutTotal: string;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const shift = await tx.shift.findFirst({
        where: { id: params.shiftId, businessId: params.businessId, status: 'OPEN' },
      });
      if (!shift) {
        throw new NotFoundException('Turno no encontrado o ya cerrado');
      }
      if (shift.userId !== params.userId) {
        throw new BadRequestException('Solo el cajero dueño del turno puede cerrarlo');
      }

      // Calcular expected (mismo cálculo que arqueo)
      const cashPayments = await tx.payment.aggregate({
        where: { businessId: params.businessId, method: 'CASH', order: { shiftId: shift.id } },
        _sum: { amount: true },
      });
      const [cashIn, cashOut] = await Promise.all([
        tx.cashMovement.aggregate({
          where: { shiftId: shift.id, type: 'CASH_IN' },
          _sum: { amount: true },
        }),
        tx.cashMovement.aggregate({
          where: { shiftId: shift.id, type: 'CASH_OUT' },
          _sum: { amount: true },
        }),
      ]);

      const opening = new Prisma.Decimal(shift.openingAmount);
      const payments = new Prisma.Decimal(cashPayments._sum.amount ?? 0);
      const movsIn = new Prisma.Decimal(cashIn._sum.amount ?? 0);
      const movsOut = new Prisma.Decimal(cashOut._sum.amount ?? 0);
      const expected = opening.plus(payments).plus(movsIn).minus(movsOut);

      const closing = new Prisma.Decimal(params.closingAmount);
      const difference = closing.minus(expected);

      // Active orders check (D11)
      const activeOrders = await tx.order.count({
        where: {
          shiftId: shift.id,
          status: { notIn: ['PAID', 'CANCELLED', 'DRAFT'] },
        },
      });
      if (activeOrders > 0) {
        this.logger.warn(
          `Closing shift ${shift.id} with ${activeOrders} active orders. Will be attributed to next shift.`,
        );
      }

      const closed = await tx.shift.update({
        where: { id: shift.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closingAmount: closing,
          expectedAmount: expected,
          difference: difference,
          closingNotes: params.closingNotes ?? null,
        },
      });

      await this.audit.log(
        {
          businessId: params.businessId,
          userId: params.userId,
          action: AuditAction.SHIFT_CLOSE,
          entity: 'Shift',
          entityId: shift.id,
          before: { status: 'OPEN', openingAmount: opening.toString() },
          after: {
            status: 'CLOSED',
            closingAmount: closing.toString(),
            expectedAmount: expected.toString(),
            difference: difference.toString(),
            activeOrdersAtClose: activeOrders,
          },
          metadata: { closingNotes: params.closingNotes, hasDifference: !difference.isZero() },
        },
        tx,
      );

      return {
        id: closed.id,
        status: closed.status,
        openedAt: closed.openedAt,
        closedAt: closed.closedAt!,
        openingAmount: opening.toString(),
        closingAmount: closing.toString(),
        expectedAmount: expected.toString(),
        difference: difference.toString(),
        cashPaymentsTotal: payments.toString(),
        cashMovementsInTotal: movsIn.toString(),
        cashMovementsOutTotal: movsOut.toString(),
      };
    });
  }

  /**
   * Lista turnos con paginación y filtros.
   */
  async listShifts(filters: {
    businessId: string;
    branchId?: string;
    userId?: string;
    status?: ShiftStatus;
    page: number;
    pageSize: number;
  }): Promise<{
    data: Array<{
      id: string;
      businessId: string;
      branchId: string;
      cashRegisterId: string;
      userId: string;
      status: ShiftStatus;
      openedAt: Date;
      closedAt: Date | null;
      openingAmount: string;
      closingAmount: string | null;
      expectedAmount: string | null;
      difference: string | null;
    }>;
    meta: { total: number; page: number; pageSize: number; totalPages: number };
  }> {
    const where: Prisma.ShiftWhereInput = {
      businessId: filters.businessId,
      ...(filters.branchId && { branchId: filters.branchId }),
      ...(filters.userId && { userId: filters.userId }),
      ...(filters.status && { status: filters.status }),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.shift.count({ where }),
      this.prisma.shift.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        include: {
          user: { select: { fullName: true, email: true } },
          cashRegister: { select: { code: true } },
        },
      }),
    ]);
    return {
      data: rows.map((s) => ({
        id: s.id,
        businessId: s.businessId,
        branchId: s.branchId,
        cashRegisterId: s.cashRegisterId,
        userId: s.userId,
        status: s.status,
        openedAt: s.openedAt,
        closedAt: s.closedAt,
        openingAmount: s.openingAmount.toString(),
        closingAmount: s.closingAmount?.toString() ?? null,
        expectedAmount: s.expectedAmount?.toString() ?? null,
        difference: s.difference?.toString() ?? null,
      })),
      meta: {
        total,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages: Math.ceil(total / filters.pageSize),
      },
    };
  }
}
