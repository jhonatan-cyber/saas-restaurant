import { Injectable, Logger } from '@nestjs/common';
import { Prisma, AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AuditService (FASE 4: activo).
 *
 * Persiste cada acción auditable en la tabla `audit_logs`. Inmutable: no
 * hay update ni delete. Intercepta:
 *  - Cambios de precio (Product.price)
 *  - Cancelaciones de órdenes (R6)
 *  - Soft-deletes
 *  - Apertura/cierre de shifts
 *  - Movimientos de caja
 *  - Pagos
 *
 * Uso típico:
 *   await this.audit.log({
 *     businessId: user.businessId,
 *     userId: user.id,
 *     action: AuditAction.PRICE_CHANGE,
 *     entity: 'Product',
 *     entityId: product.id,
 *     before: { price: oldPrice },
 *     after: { price: newPrice },
 *   });
 *
 * La acción se registra en una `tx` opcional para garantizar atomicidad
 * con el cambio que la origina. Si la tx falla, el log también se revierte.
 */
export interface AuditLogParams {
  businessId: string;
  userId: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra una acción auditable dentro de una transacción.
   * Si no se le pasa `tx`, usa el cliente global.
   */
  async log(
    params: AuditLogParams,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        businessId: params.businessId,
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        before: (params.before ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        after: (params.after ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        metadata: (params.metadata ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Lista logs con filtros y paginación. Para vista de admin/auditoría.
   */
  async query(filters: {
    businessId: string;
    entity?: string;
    entityId?: string;
    action?: AuditAction;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    pageSize?: number;
  }): Promise<{
    data: Array<{
      id: string;
      createdAt: Date;
      userId: string;
      entity: string;
      entityId: string;
      action: AuditAction;
      before: unknown;
      after: unknown;
      metadata: unknown;
    }>;
    meta: { total: number; page: number; pageSize: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const where: Prisma.AuditLogWhereInput = {
      businessId: filters.businessId,
      ...(filters.entity && { entity: filters.entity }),
      ...(filters.entityId && { entityId: filters.entityId }),
      ...(filters.action && { action: filters.action }),
      ...(filters.userId && { userId: filters.userId }),
      ...((filters.dateFrom || filters.dateTo) && {
        createdAt: {
          ...(filters.dateFrom && { gte: filters.dateFrom }),
          ...(filters.dateTo && { lte: filters.dateTo }),
        },
      }),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        userId: r.userId,
        entity: r.entity,
        entityId: r.entityId,
        action: r.action,
        before: r.before,
        after: r.after,
        metadata: r.metadata,
      })),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
