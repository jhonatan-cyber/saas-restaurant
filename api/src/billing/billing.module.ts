import { Module, Global } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeService } from './stripe.service';
import { QuotaEnforcer } from './quota.enforcer';

/**
 * Módulo de facturación y cuotas (Phase 8).
 *
 * - StripeService: Integración con Stripe Checkout + Webhooks.
 * - QuotaEnforcer: Verifica límites del plan antes de crear recursos.
 *
 * Es @Global() para que StripeService y QuotaEnforcer estén disponibles
 * en todos los módulos sin necesidad de importarlo explícitamente.
 */
@Global()
@Module({
  controllers: [BillingController, StripeWebhookController],
  providers: [StripeService, QuotaEnforcer],
  exports: [StripeService, QuotaEnforcer],
})
export class BillingModule {}
