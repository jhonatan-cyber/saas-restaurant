import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { Prisma, AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateCashMovementDto } from './dto/cash-movement.dto';

/**
 * CashMovementsService (FASE 4).
 *
 * Egresos e ingresos de dinero no relacionados a ventas directas.
 * Cada movimiento se vincula a un shift OPEN del branch (auto-resuelto
 * al del cajero autenticado).
 *
 * Reglas:
 *  - El monto debe ser > 0.
 *  - El shift debe estar OPEN en la sucursal indicada.
 *  - Se permite INFLOW sin shift (aporte de capital inicial).
 *  - Se audita cada movimiento.
 */
@Injectable()
export class CashMovementsService {
  private readonly logger = new Logger(CashMovementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(params: {
    businessId: string;
    userId: string;
    dto: CreateCashMovementDto;
  }): Promise<{
    id: string;
    type: 'CASH_IN' | 'CASH_OUT';
    category: string;
    amount: string;
    reason: string | null;
    shiftId: string | null;
    createdAt: Date;
  }> {
    return this.prisma.$transaction(async (tx) => {
      // Resolver shift OPEN del usuario en este branch
      const openShift = await tx.shift.findFirst({
        where: {
          businessId: params.businessId,
          branchId: params.dto.branchId,
          userId: params.userId,
          status: 'OPEN',
        },
        orderBy: { openedAt: 'desc' },
      });

      // OUTFLOW requiere shift abierto (no podés sacar plata sin caja)
      // INFLOW también lo requiere, salvo categorías especiales (aporte inicial)
      if (!openShift) {
        const isInitialInvestment =
          params.dto.type === 'CASH_IN' &&
          (params.dto.category === 'OWNER_INVESTMENT' ||
            params.dto.category === 'LOAN_RECEIVED');
        if (!isInitialInvestment) {
          throw new BadRequestException(
            'Necesitás un turno abierto para registrar este movimiento. Abrí turno primero.',
          );
        }
      }

      const movement = await tx.cashMovement.create({
        data: {
          businessId: params.businessId,
          branchId: params.dto.branchId,
          shiftId: openShift?.id ?? null,
          type: params.dto.type,
          category: params.dto.category,
          amount: new Prisma.Decimal(params.dto.amount),
          reason: params.dto.reason ?? null,
          createdByUserId: params.userId,
        },
      });

      await this.audit.log(
        {
          businessId: params.businessId,
          userId: params.userId,
          action: AuditAction.CASH_MOVEMENT,
          entity: 'CashMovement',
          entityId: movement.id,
          after: {
            type: movement.type,
            category: movement.category,
            amount: movement.amount.toString(),
            shiftId: movement.shiftId,
            reason: movement.reason,
          },
        },
        tx,
      );

      return {
        id: movement.id,
        type: movement.type,
        category: movement.category,
        amount: movement.amount.toString(),
        reason: movement.reason,
        shiftId: movement.shiftId,
        createdAt: movement.createdAt,
      };
    });
  }

  async list(filters: {
    businessId: string;
    branchId?: string;
    shiftId?: string;
    type?: 'CASH_IN' | 'CASH_OUT';
    category?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page: number;
    pageSize: number;
  }): Promise<{
    data: Array<{
      id: string;
      businessId: string;
      branchId: string;
      shiftId: string | null;
      type: 'CASH_IN' | 'CASH_OUT';
      category: string;
      amount: string;
      reason: string | null;
      createdByUserId: string;
      createdAt: Date;
    }>;
    meta: { total: number; page: number; pageSize: number; totalPages: number };
  }> {
    // Casting seguro: los valores coinciden con los enum de Prisma
    const where: Prisma.CashMovementWhereInput = {
      businessId: filters.businessId,
      ...(filters.branchId && { branchId: filters.branchId }),
      ...(filters.shiftId && { shiftId: filters.shiftId }),
      ...(filters.type && { type: filters.type as any }),
      ...(filters.category && { category: filters.category as any }),
      ...((filters.dateFrom || filters.dateTo) && {
        createdAt: {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        },
      }),
    };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.cashMovement.count({ where }),
      this.prisma.cashMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        include: {
          user: { select: { fullName: true, email: true } },
        },
      }),
    ]);
    return {
      data: rows.map((m) => ({
        id: m.id,
        businessId: m.businessId,
        branchId: m.branchId,
        shiftId: m.shiftId,
        type: m.type,
        category: m.category,
        amount: m.amount.toString(),
        reason: m.reason,
        createdByUserId: m.createdByUserId,
        createdAt: m.createdAt,
      })),
      meta: {
        total,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages: Math.ceil(total / filters.pageSize),
      },
    };
  }

  async getSummary(filters: {
    businessId: string;
    branchId: string;
    shiftId?: string;
  }): Promise<{
    totalIn: string;
    totalOut: string;
    net: string;
    count: number;
  }> {
    const where: Prisma.CashMovementWhereInput = {
      businessId: filters.businessId,
      branchId: filters.branchId,
      ...(filters.shiftId && { shiftId: filters.shiftId }),
    };
    const [cashIn, cashOut, count] = await this.prisma.$transaction([
      this.prisma.cashMovement.aggregate({ where: { ...where, type: 'CASH_IN' }, _sum: { amount: true } }),
      this.prisma.cashMovement.aggregate({ where: { ...where, type: 'CASH_OUT' }, _sum: { amount: true } }),
      this.prisma.cashMovement.count({ where }),
    ]);
    const totalIn = new Prisma.Decimal(cashIn._sum.amount ?? 0);
    const totalOut = new Prisma.Decimal(cashOut._sum.amount ?? 0);
    return {
      totalIn: totalIn.toString(),
      totalOut: totalOut.toString(),
      net: totalIn.minus(totalOut).toString(),
      count,
    };
  }
}
