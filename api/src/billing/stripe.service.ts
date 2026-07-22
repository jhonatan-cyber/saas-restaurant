import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import type { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe | null;
  private readonly logger = new Logger(StripeService.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY', '');
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    if (!secretKey) {
      this.logger.warn('STRIPE_SECRET_KEY no configurada — Stripe deshabilitado');
      this.stripe = null;
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-03-31' as Stripe.LatestApiVersion,
      });
    }
  }

  /**
   * Crea una Checkout Session para que el usuario pague en Stripe.
   * Retorna la URL a la que redirigir al usuario.
   */
  async createCheckoutSession(dto: {
    businessId: string;
    planId: string;
    userId: string;
    successUrl?: string;
    cancelUrl?: string;
  }) {
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new Error('Plan no encontrado');
    if (!plan.isActive) throw new Error('El plan no está activo');
    if (Number(plan.price) <= 0) throw new Error('El plan es gratuito, no requiere pago');

    const business = await this.prisma.business.findUnique({ where: { id: dto.businessId } });
    if (!business) throw new Error('Negocio no encontrado');

    const baseUrl = this.config.get<string>('API_PUBLIC_URL', 'http://localhost:3001');
    const successUrl = dto.successUrl ?? `${baseUrl}/api/billing/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = dto.cancelUrl ?? `${baseUrl}/api/billing/checkout/cancel`;

    if (!this.stripe) throw new Error('Stripe no está configurado (STRIPE_SECRET_KEY faltante)');
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: plan.currency.toLowerCase(),
            product_data: {
              name: plan.name,
              description: plan.description ?? undefined,
            },
            unit_amount: Math.round(Number(plan.price) * 100), // cents
            recurring: {
              interval: plan.billingPeriod === 'YEARLY' ? 'year' : 'month',
            },
          },
          quantity: 1,
        },
      ],
      client_reference_id: dto.businessId,
      metadata: {
        businessId: dto.businessId,
        planId: dto.planId,
        userId: dto.userId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return {
      url: session.url!,
      sessionId: session.id,
    };
  }

  /**
   * Procesa un webhook de Stripe.
   * Retorna un objeto indicando si el evento fue procesado.
   */
  async handleWebhook(signature: string, body: Buffer): Promise<{ received: boolean }> {
    let event: Stripe.Event;
    try {
      if (!this.stripe) throw new Error('Stripe no está configurado (STRIPE_SECRET_KEY faltante)');
    event = this.stripe.webhooks.constructEvent(body, signature, this.webhookSecret);
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${(err as Error).message}`);
      throw new Error('Invalid signature');
    }

    this.logger.log(`Webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await this.handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string };
        if (invoice.subscription) {
          await this.handlePaymentFailed(invoice.subscription);
        }
        break;
      }
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Sincroniza el estado de la suscripción local con Stripe.
   */
  async syncSubscription(businessId: string): Promise<void> {
    const sub = await this.prisma.subscription.findUnique({
      where: { businessId },
    });
    if (!sub?.stripeSubscriptionId) return;

    try {
      if (!this.stripe) throw new Error('Stripe no está configurado (STRIPE_SECRET_KEY faltante)');
      const stripeSub = await this.stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
      await this.syncFromStripeSubscription(businessId, stripeSub);
    } catch (err) {
      this.logger.warn(`Error syncing subscription ${sub.stripeSubscriptionId}: ${(err as Error).message}`);
    }
  }

  /**
   * Crea un Portal de facturación de Stripe para que el usuario gestione su suscripción.
   */
  async createPortalSession(businessId: string, returnUrl?: string): Promise<{ url: string }> {
    const sub = await this.prisma.subscription.findUnique({
      where: { businessId },
    });
    if (!sub?.stripeCustomerId) {
      throw new Error('No hay cliente de Stripe asociado a esta cuenta');
    }
    if (!this.stripe) throw new Error('Stripe no está configurado (STRIPE_SECRET_KEY faltante)');

    const baseUrl = this.config.get<string>('API_PUBLIC_URL', 'http://localhost:3001');
    const session = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl ?? `${baseUrl}/api/billing/portal/return`,
    });

    return { url: session.url };
  }

  // ── Handlers privados ─────────────────────────────────────────

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const businessId = session.metadata?.businessId;
    const planId = session.metadata?.planId;
    if (!businessId || !planId) {
      this.logger.warn('Checkout session missing businessId or planId in metadata');
      return;
    }

    const stripeSubscriptionId = session.subscription as string;
    const stripeCustomerId = session.customer as string;

    if (!this.stripe) throw new Error('Stripe no está configurado (STRIPE_SECRET_KEY faltante)');
    // Obtener detalles de la suscripción de Stripe
    const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    const status = this.mapStripeStatus(stripeSub.status);

    const subPeriod = stripeSub as unknown as { current_period_start: number; current_period_end: number };
    const currentPeriodStart = new Date(subPeriod.current_period_start * 1000);
    const currentPeriodEnd = new Date(subPeriod.current_period_end * 1000);

    // Actualizar o crear suscripción local
    const existing = await this.prisma.subscription.findUnique({
      where: { businessId },
    });

    if (existing) {
      await this.prisma.subscription.update({
        where: { businessId },
        data: {
          planId,
          status,
          currentPeriodStart,
          currentPeriodEnd,
          stripeSubscriptionId,
          stripeCustomerId,
          cancelledAt: null,
        },
      });
    } else {
      await this.prisma.subscription.create({
        data: {
          businessId,
          planId,
          status,
          currentPeriodStart,
          currentPeriodEnd,
          stripeSubscriptionId,
          stripeCustomerId,
        },
      });
    }

    this.logger.log(`Subscription synced for business ${businessId}: ${status}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const metadata = subscription.metadata;
    const businessId = metadata?.businessId;
    if (!businessId) {
      // Buscar por stripeSubscriptionId en la BD local
      const local = await this.prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subscription.id },
      });
      if (!local) {
        this.logger.warn(`No local subscription found for Stripe sub ${subscription.id}`);
        return;
      }
      await this.syncFromStripeSubscription(local.businessId, subscription);
    } else {
      await this.syncFromStripeSubscription(businessId, subscription);
    }
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const local = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!local) {
      this.logger.warn(`No local subscription found for deleted Stripe sub ${subscription.id}`);
      return;
    }

    await this.prisma.subscription.update({
      where: { businessId: local.businessId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    this.logger.log(`Subscription cancelled for business ${local.businessId}`);
  }

  private async handlePaymentFailed(stripeSubscriptionId: string) {
    const local = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId },
    });
    if (!local) return;

    await this.prisma.subscription.update({
      where: { businessId: local.businessId },
      data: { status: 'PAST_DUE' },
    });
    this.logger.warn(`Payment failed for business ${local.businessId}, status set to PAST_DUE`);
  }

  private async syncFromStripeSubscription(businessId: string, sub: Stripe.Subscription) {
    const status = this.mapStripeStatus(sub.status);
    const subPeriod = sub as unknown as { current_period_start: number; current_period_end: number };
    const currentPeriodStart = new Date(subPeriod.current_period_start * 1000);
    const currentPeriodEnd = new Date(subPeriod.current_period_end * 1000);

    await this.prisma.subscription.update({
      where: { businessId },
      data: {
        status,
        currentPeriodStart,
        currentPeriodEnd,
        stripeSubscriptionId: sub.id,
      },
    });
  }

  private mapStripeStatus(stripeStatus: Stripe.Subscription.Status): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return 'ACTIVE';
      case 'past_due':
        return 'PAST_DUE';
      case 'canceled':
        return 'CANCELLED';
      case 'incomplete':
      case 'incomplete_expired':
        return 'EXPIRED';
      case 'trialing':
        return 'TRIALING';
      case 'paused':
      case 'unpaid':
        return 'PAST_DUE';
      default:
        return 'EXPIRED';
    }
  }
}
