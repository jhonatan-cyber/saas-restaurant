import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener suscripción actual del negocio.
   */
  async getCurrent(businessId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { businessId },
      include: { plan: true },
    });
    return sub;
  }

  /**
   * Asignar un plan a un negocio.
   * Si ya tiene una suscripción activa, la cancela y crea una nueva.
   */
  async assign(businessId: string, planId: string) {
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

    // Si ya existe, actualizar; si no, crear
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
        status: 'TRIALING',
        currentPeriodStart: now,
        currentPeriodEnd: addDays(now, 14), // 14-day trial
        trialEndsAt: addDays(now, 14),
      },
      include: { plan: true },
    });
  }

  /**
   * Cancelar suscripción activa.
   */
  async cancel(businessId: string) {
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
}
