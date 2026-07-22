import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Tipo de recurso sobre el que se verifica la cuota.
 */
export type QuotaResource =
  | 'users'
  | 'branches'
  | 'products'
  | 'categories'
  | 'monthlyOrders';

/**
 * Mapea cada recurso al campo correspondiente en el modelo Plan.
 */
const QUOTA_FIELDS: Record<QuotaResource, keyof import('@prisma/client').Plan> = {
  users: 'maxUsers',
  branches: 'maxBranches',
  products: 'maxProducts',
  categories: 'maxCategories',
  monthlyOrders: 'maxMonthlyOrders',
};

/**
 * Mapea cada recurso al modelo y condiciones de conteo en Prisma.
 */
const QUOTA_COUNT_FN: Record<QuotaResource, (businessId: string, prisma: PrismaService) => Promise<number>> = {
  users: (businessId, prisma) =>
    prisma.user.count({ where: { businessId, status: { not: 'INACTIVE' } } }),
  branches: (businessId, prisma) =>
    prisma.branch.count({ where: { businessId, status: 'ACTIVE' } }),
  products: (businessId, prisma) =>
    prisma.product.count({ where: { businessId, deletedAt: null } }),
  categories: (businessId, prisma) =>
    prisma.category.count({ where: { businessId, deletedAt: null } }),
  monthlyOrders: (businessId, prisma) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return prisma.order.count({
      where: { businessId, createdAt: { gte: startOfMonth } },
    });
  },
};

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  resource: QuotaResource;
}

@Injectable()
export class QuotaEnforcer {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica si el negocio puede crear más recursos de un tipo dado.
   * Lanza ForbiddenException si se excede el límite.
   * Retorna el resultado si está dentro del límite.
   */
  async checkOrThrow(businessId: string, resource: QuotaResource): Promise<QuotaCheckResult> {
    const result = await this.check(businessId, resource);
    if (!result.allowed) {
      throw new ForbiddenException(
        `Límite del plan excedido: máximo ${result.limit} ${resource}. Actual: ${result.current}. ` +
        'Actualiza tu plan para aumentar el límite.',
      );
    }
    return result;
  }

  /**
   * Verifica si el negocio puede crear más recursos de un tipo dado.
   * Retorna el resultado sin lanzar excepción.
   */
  async check(businessId: string, resource: QuotaResource): Promise<QuotaCheckResult> {
    const plan = await this.getEffectivePlan(businessId);
    const limitField = QUOTA_FIELDS[resource];
    let limit = (plan as any)[limitField] as number;

    // Verificar override específico para users (overrideMaxUsers en Business)
    if (resource === 'users') {
      const business = await this.prisma.business.findUnique({
        where: { id: businessId },
        select: { overrideMaxUsers: true },
      });
      if (business?.overrideMaxUsers !== null && business?.overrideMaxUsers !== undefined) {
        limit = business.overrideMaxUsers;
      }
    }

    const countFn = QUOTA_COUNT_FN[resource];
    const current = await countFn(businessId, this.prisma);

    return {
      allowed: current < limit,
      current,
      limit,
      resource,
    };
  }

  /**
   * Obtiene el plan efectivo del negocio.
   * Si no tiene suscripción, usa el plan FREE por defecto.
   */
  private async getEffectivePlan(businessId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { businessId },
      include: { plan: true },
    });

    if (sub?.plan && sub.status !== 'CANCELLED' && sub.status !== 'EXPIRED') {
      return sub.plan;
    }

    // Plan FREE por defecto
    const freePlan = await this.prisma.plan.findUnique({
      where: { code: 'FREE' },
    });

    if (freePlan) return freePlan;

    // Si no existe plan FREE, devolver límites por defecto
    return {
      maxUsers: 3,
      maxBranches: 1,
      maxProducts: 50,
      maxCategories: 10,
      maxMonthlyOrders: 500,
      maxStorageMb: 100,
    };
  }
}
