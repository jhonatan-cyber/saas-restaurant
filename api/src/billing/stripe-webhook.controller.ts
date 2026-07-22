import { Controller, Post, Headers, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from './stripe.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Webhook controller for Stripe events.
 * - MUST receive raw body (not parsed JSON) for signature verification.
 * - All routes are @Public() (no JWT auth).
 *
 * Raw body middleware is configured in main.ts via `rawBody: true` for this route.
 */
@Controller('stripe')
export class StripeWebhookController {
  constructor(private readonly stripe: StripeService) {}

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
  ) {
    // Stripe requires the raw body for signature verification
    const rawBody = (req as any).rawBody ?? Buffer.from(JSON.stringify(req.body));
    return this.stripe.handleWebhook(signature, rawBody as Buffer);
  }
}
