import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [totalBusinesses, totalUsers, totalOrders, activeSubscriptions] =
      await Promise.all([
        this.prisma.business.count(),
        this.prisma.user.count(),
        this.prisma.order.count(),
        this.prisma.subscription.count({
          where: { status: 'ACTIVE' },
        }),
      ]);

    return {
      totalBusinesses,
      totalUsers,
      totalOrders,
      activeSubscriptions,
    };
  }

  async listBusinesses(params: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    planCode?: string;
  }) {
    const where: Record<string, unknown> = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { slug: { contains: params.search } },
        { email: { contains: params.search } },
      ];
    }

    if (params.status) {
      where.status = params.status;
    }

    if (params.dateFrom || params.dateTo) {
      const createdAt: Record<string, Date> = {};
      if (params.dateFrom) createdAt.gte = new Date(params.dateFrom);
      if (params.dateTo) createdAt.lte = new Date(params.dateTo);
      where.createdAt = createdAt;
    }

    if (params.planCode) {
      where.subscription = {
        plan: { code: params.planCode },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.business.findMany({
        where,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            include: { plan: true },
          },
          _count: {
            select: {
              users: true,
              branches: true,
              orders: true,
            },
          },
        },
      }),
      this.prisma.business.count({ where }),
    ]);

    return {
      data: data.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        email: b.email,
        status: b.status,
        plan: b.subscription?.plan?.name ?? 'Sin plan',
        planCode: b.subscription?.plan?.code ?? null,
        subscriptionStatus: b.subscription?.status ?? null,
        usersCount: b._count.users,
        branchesCount: b._count.branches,
        ordersCount: b._count.orders,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
      })),
      meta: {
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages: Math.ceil(total / params.pageSize),
      },
    };
  }

  async getBusinessDetail(businessId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      include: {
        subscription: {
          include: { plan: true },
        },
        _count: {
          select: {
            users: true,
            branches: true,
            orders: true,
            products: true,
            customers: true,
          },
        },
      },
    });

    if (!business) return null;

    return {
      id: business.id,
      name: business.name,
      slug: business.slug,
      legalName: business.legalName,
      taxId: business.taxId,
      email: business.email,
      phone: business.phone,
      currency: business.currency,
      timezone: business.timezone,
      status: business.status,
      subscription: business.subscription
        ? {
            id: business.subscription.id,
            plan: business.subscription.plan?.name ?? null,
            planCode: business.subscription.plan?.code ?? null,
            planId: business.subscription.plan?.id ?? null,
            status: business.subscription.status,
            currentPeriodStart: business.subscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: business.subscription.currentPeriodEnd.toISOString(),
          }
        : null,
      stats: {
        users: business._count.users,
        branches: business._count.branches,
        orders: business._count.orders,
        products: business._count.products,
        customers: business._count.customers,
      },
      createdAt: business.createdAt.toISOString(),
      updatedAt: business.updatedAt.toISOString(),
    };
  }

  /**
   * Asignar un plan a un negocio (admin).
   */
  async assignPlan(businessId: string, planId: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!plan.isActive) throw new BadRequestException('El plan no está activo');

    const existing = await this.prisma.subscription.findUnique({
      where: { businessId },
    });

    const now = new Date();
    const periodEnd =
      plan.billingPeriod === 'YEARLY'
        ? addYears(now, 1)
        : addMonths(now, 1);

    if (existing) {
      return this.prisma.subscription.update({
        where: { businessId },
        data: {
          planId,
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: null,
          cancelledAt: null,
        },
        include: { plan: true },
      });
    }

    return this.prisma.subscription.create({
      data: {
        businessId,
        planId,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });
  }

  /**
   * Cancelar suscripción de un negocio (admin).
   */
  async cancelSubscription(businessId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { businessId },
    });
    if (!sub) throw new NotFoundException('No hay suscripción activa');
    if (sub.status === 'CANCELLED' || sub.status === 'EXPIRED') {
      throw new BadRequestException('La suscripción ya está cancelada o expirada');
    }

    return this.prisma.subscription.update({
      where: { businessId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
      include: { plan: true },
    });
  }

  // ==================== BUSINESS UPDATE ====================

  async updateBusiness(
    businessId: string,
    data: { name?: string; email?: string; status?: string },
  ) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId } });
    if (!business) throw new NotFoundException('Negocio no encontrado');

    if (data.status && !['ACTIVE', 'SUSPENDED'].includes(data.status)) {
      throw new BadRequestException('Status debe ser ACTIVE o SUSPENDED');
    }

    return this.prisma.business.update({
      where: { id: businessId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.status !== undefined && { status: data.status as any }),
      },
    });
  }

  // ==================== SaaS USERS ====================

  async listSaaSUsers(page: number, pageSize: number) {
    const [data, total] = await Promise.all([
      this.prisma.saaSUser.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, role: true, status: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.saaSUser.count(),
    ]);

    return {
      data,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async createSaaSUser(email: string, password: string, role: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await this.prisma.saaSUser.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new ConflictException('Ya existe un usuario con ese email');

    const passwordHash = await bcrypt.hash(password, 12);

    return this.prisma.saaSUser.create({
      data: { email: normalizedEmail, passwordHash, role: role as any, fullName: 'Admin' },
      select: { id: true, email: true, role: true, status: true, createdAt: true },
    });
  }

  // ==================== DASHBOARD SERIES ====================

  async getDashboardSeries() {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [businesses, orders] = await Promise.all([
      this.prisma.business.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: sixMonthsAgo } },
        select: { createdAt: true, total: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Agrupar por mes
    const months: Record<string, { businesses: number; orders: number; revenue: number }> = {};
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { businesses: 0, orders: 0, revenue: 0 };
    }

    for (const b of businesses) {
      const key = `${b.createdAt.getFullYear()}-${String(b.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) months[key].businesses++;
    }

    for (const o of orders) {
      const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].orders++;
        months[key].revenue += Number(o.total ?? 0);
      }
    }

    return Object.entries(months).map(([month, counts]) => ({
      month,
      ...counts,
    }));
  }

  // ==================== SUBSCRIPTIONS ====================

  async listSubscriptions(page: number, pageSize: number, filters?: { status?: string; planId?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.planId) where.planId = filters.planId;

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where: where as any,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { id: true, name: true, slug: true, email: true, status: true } },
          plan: { select: { id: true, name: true, code: true, price: true, billingPeriod: true } },
        },
      }),
      this.prisma.subscription.count({ where: where as any }),
    ]);

    return {
      data: data.map((s) => ({
        id: s.id,
        businessId: s.businessId,
        business: s.business,
        planId: s.planId,
        plan: s.plan,
        status: s.status,
        currentPeriodStart: s.currentPeriodStart.toISOString(),
        currentPeriodEnd: s.currentPeriodEnd.toISOString(),
        trialEndsAt: s.trialEndsAt?.toISOString() ?? null,
        cancelledAt: s.cancelledAt?.toISOString() ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  // ==================== GLOBAL AUDIT LOG ====================

  async listAuditLogs(page: number, pageSize: number, filters?: { action?: string; entity?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.action) where.action = filters.action;
    if (filters?.entity) where.entity = filters.entity;

    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where: where as any }),
      this.prisma.auditLog.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data: rows.map((r) => ({
        id: r.id,
        createdAt: r.createdAt,
        businessId: r.businessId,
        userId: r.userId,
        entity: r.entity,
        entityId: r.entityId,
        action: r.action,
        metadata: r.metadata,
      })),
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }
}
