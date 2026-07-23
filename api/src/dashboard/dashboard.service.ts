import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Filter = { businessId: string; branchId?: string };

/**
 * Métricas en tiempo real para el dashboard del admin.
 * Queries directas a la BD (no BullMQ).
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(params: { businessId: string; branchId?: string | null }) {
    const { businessId, branchId } = params;
    const filter: Filter = { businessId };
    if (branchId) filter.branchId = branchId;

    const [
      todaySales,
      todayOrdersCount,
      activeOrdersByStatus,
      weeklySalesTrend,
      topProducts,
      paymentMethods,
      tablesSummary,
      counts,
    ] = await Promise.all([
      this.getTodaySales(filter),
      this.getTodayOrdersCount(filter),
      this.getActiveOrdersByStatus(filter),
      this.getWeeklySalesTrend(filter),
      this.getTopProducts(businessId, filter),
      this.getPaymentMethodDistribution(businessId),
      this.getTablesSummary(filter),
      this.getQuickCounts(filter),
    ]);

    return {
      todaySales,
      todayOrdersCount,
      activeOrdersByStatus,
      weeklySalesTrend,
      topProducts,
      paymentMethods,
      tablesSummary,
      counts,
      generatedAt: new Date().toISOString(),
    };
  }

  private async getTodaySales(f: Filter) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const r = await this.prisma.order.aggregate({
      where: { ...f, status: 'PAID', updatedAt: { gte: start } },
      _sum: { total: true }, _count: { id: true },
    });
    return {
      total: r._sum.total?.toString() ?? '0',
      count: r._count.id,
      average: r._count.id > 0 ? (Number(r._sum.total ?? 0) / r._count.id).toFixed(2) : '0',
    };
  }

  private async getTodayOrdersCount(f: Filter) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const total = await this.prisma.order.count({ where: { ...f, createdAt: { gte: start } } });
    return { total };
  }

  private async getActiveOrdersByStatus(f: Filter) {
    const statuses = ['PENDING', 'SENT_TO_KITCHEN', 'IN_PREPARATION', 'READY', 'DELIVERED'];
    const [counts, recentOrders] = await Promise.all([
      Promise.all(statuses.map(async (status) => {
        const count = await this.prisma.order.count({ where: { ...f, status: status as any } });
        return { status, count };
      })),
      this.prisma.order.findMany({
        where: { ...f, status: { in: statuses as any } },
        include: { table: { select: { number: true } }, _count: { select: { items: true } } },
        orderBy: { createdAt: 'desc' }, take: 5,
      }),
    ]);
    return {
      byStatus: counts,
      total: counts.reduce((a, b) => a + b.count, 0),
      recent: recentOrders.map((o) => ({
        id: o.id, status: o.status, type: o.type,
        tableNumber: o.table?.number ?? null, itemCount: o._count.items,
        total: o.total.toString(), createdAt: o.createdAt.toISOString(),
        elapsedMinutes: Math.floor((Date.now() - o.createdAt.getTime()) / 60000),
      })),
    };
  }

  private async getWeeklySalesTrend(f: Filter) {
    const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const days: Array<{ label: string; total: number; count: number }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const nd = new Date(d); nd.setDate(nd.getDate() + 1);
      const r = await this.prisma.order.aggregate({
        where: { ...f, status: 'PAID', updatedAt: { gte: d, lt: nd } },
        _sum: { total: true }, _count: { id: true },
      });
      days.push({ label: labels[d.getDay()] ?? '', total: Number(r._sum.total ?? 0), count: r._count.id });
    }
    return {
      days,
      total: days.reduce((a, b) => a + b.total, 0),
      average: (days.reduce((a, b) => a + b.total, 0) / 7).toFixed(2),
    };
  }

  /** Requiere `businessId` como string plano para evitar issues de tipos con groupBy de Prisma */
  private async getTopProducts(businessId: string, f: Filter) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const orders = await this.prisma.order.findMany({
      where: { ...f, status: 'PAID', updatedAt: { gte: start } },
      select: { id: true },
    });
    if (orders.length === 0) return { items: [], total: 0 };

    const items = await this.prisma.orderItem.groupBy({
      by: ['productName', 'productId'],
      where: { businessId, orderId: { in: orders.map((o) => o.id) }, productId: { not: null } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: 'desc' } }, take: 10,
    });
    return {
      items: items.map((i) => ({
        productId: i.productId, productName: i.productName,
        quantity: i._sum.quantity ?? 0, total: (i._sum.lineTotal ?? 0).toString(),
      })),
      total: items.reduce((a, i) => a + (i._sum.quantity ?? 0), 0),
    };
  }

  /** Requiere `businessId` como string plano para evitar issues de tipos con groupBy de Prisma */
  private async getPaymentMethodDistribution(businessId: string) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const payments = await this.prisma.payment.groupBy({
      by: ['method'],
      where: { businessId, createdAt: { gte: start } },
      _sum: { amount: true }, _count: { id: true },
      orderBy: { _sum: { amount: 'desc' } },
    });
    const total = payments.reduce((a, p) => a + Number(p._sum.amount ?? 0), 0);
    return {
      methods: payments.map((p) => ({
        method: p.method, amount: (p._sum.amount ?? 0).toString(),
        count: p._count.id,
        percentage: total > 0 ? Math.round((Number(p._sum.amount ?? 0) / total) * 100) : 0,
      })),
      total: total.toString(),
    };
  }

  private async getTablesSummary(f: Filter) {
    const tables = await this.prisma.restaurantTable.findMany({
      where: { ...f, deletedAt: null }, select: { status: true },
    });
    return {
      total: tables.length,
      free: tables.filter((t) => t.status === 'FREE').length,
      occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
      reserved: tables.filter((t) => t.status === 'RESERVED').length,
    };
  }

  private async getQuickCounts(f: Filter) {
    const [products, categories, customers, users] = await Promise.all([
      this.prisma.product.count({ where: { ...f, deletedAt: null, isActive: true } }),
      this.prisma.category.count({ where: { ...f, deletedAt: null, isActive: true } }),
      this.prisma.customer.count({ where: { ...f, isActive: true } }),
      this.prisma.user.count({ where: { businessId: f.businessId, status: 'ACTIVE' } }),
    ]);

    const trackable = await this.prisma.product.findMany({
      where: { ...f, deletedAt: null, trackStock: true, minStock: { not: null } },
      select: { currentStock: true, minStock: true },
    });
    const lowStock = trackable.filter((p) => p.currentStock.lte(p.minStock!)).length;
    return { products, categories, customers, users, lowStock };
  }
}
