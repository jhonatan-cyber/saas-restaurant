import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { createMockConfigService } from '../test/mocks';

// Mock the Stripe constructor at module level
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          url: 'https://checkout.stripe.com/session_123',
          id: 'cs_test_123',
        }),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_123',
        status: 'active',
        metadata: { businessId: 'biz-1' },
        current_period_start: Math.floor(Date.now() / 1000) - 86400,
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      }),
    },
    billingPortal: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          url: 'https://billing.stripe.com/session_123',
        }),
      },
    },
  }));
});

describe('StripeService', () => {
  let service: StripeService;
  let prisma: any;
  let config: ReturnType<typeof createMockConfigService>;

  // ── Setup helpers ──────────────────────────────────────────────────────

  async function buildService(extraConfig: Record<string, unknown> = {}) {
    config = createMockConfigService({
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_123',
      API_PUBLIC_URL: 'https://api.example.com',
      ...extraConfig,
    });

    prisma = {
      plan: {
        findUnique: jest.fn(),
      },
      business: {
        findUnique: jest.fn(),
      },
      subscription: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeService,
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(StripeService);
  }

  // ── Constructor ────────────────────────────────────────────────────────

  describe('constructor', () => {
    beforeEach(async () => {
      config = createMockConfigService({
        STRIPE_SECRET_KEY: '',
        STRIPE_WEBHOOK_SECRET: '',
      });
      prisma = { plan: { findUnique: jest.fn() } };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StripeService,
          { provide: ConfigService, useValue: config },
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      service = module.get(StripeService);
    });

    it('sets stripe to null when STRIPE_SECRET_KEY is empty', () => {
      expect((service as any).stripe).toBeNull();
    });
  });

  // ── createCheckoutSession ──────────────────────────────────────────────

  describe('createCheckoutSession', () => {
    beforeEach(async () => {
      await buildService();
    });

    it('throws when Stripe is not configured', async () => {
      // Rebuild with no STRIPE_SECRET_KEY
      config = createMockConfigService({
        STRIPE_SECRET_KEY: '',
        API_PUBLIC_URL: 'https://api.example.com',
      });

      // Must mock plan and business so we pass those checks
      prisma.plan.findUnique.mockResolvedValue({
        id: 'plan-1',
        name: 'Pro Plan',
        price: '29.99',
        currency: 'USD',
        billingPeriod: 'MONTHLY',
        isActive: true,
      });
      prisma.business.findUnique.mockResolvedValue({
        id: 'biz-1',
        name: 'Test Business',
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StripeService,
          { provide: ConfigService, useValue: config },
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      const svc = module.get(StripeService);
      await expect(
        svc.createCheckoutSession({
          businessId: 'biz-1',
          planId: 'plan-1',
          userId: 'user-1',
        }),
      ).rejects.toThrow('Stripe no está configurado');
    });

    it('creates a checkout session and returns URL + sessionId', async () => {
      prisma.plan.findUnique.mockResolvedValue({
        id: 'plan-1',
        name: 'Pro Plan',
        description: 'The pro plan',
        price: '29.99',
        currency: 'USD',
        billingPeriod: 'MONTHLY',
        isActive: true,
      });
      prisma.business.findUnique.mockResolvedValue({
        id: 'biz-1',
        name: 'Test Business',
      });

      const result = await service.createCheckoutSession({
        businessId: 'biz-1',
        planId: 'plan-1',
        userId: 'user-1',
      });

      expect(result).toEqual({
        url: 'https://checkout.stripe.com/session_123',
        sessionId: 'cs_test_123',
      });
    });

    it('throws when plan is not found', async () => {
      prisma.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession({
          businessId: 'biz-1',
          planId: 'non-existent',
          userId: 'user-1',
        }),
      ).rejects.toThrow('Plan no encontrado');
    });

    it('throws when plan is inactive', async () => {
      prisma.plan.findUnique.mockResolvedValue({
        id: 'plan-1',
        price: '29.99',
        isActive: false,
      });

      await expect(
        service.createCheckoutSession({
          businessId: 'biz-1',
          planId: 'plan-1',
          userId: 'user-1',
        }),
      ).rejects.toThrow('El plan no está activo');
    });

    it('throws when plan is free (price ≤ 0)', async () => {
      prisma.plan.findUnique.mockResolvedValue({
        id: 'plan-1',
        price: '0',
        isActive: true,
      });

      await expect(
        service.createCheckoutSession({
          businessId: 'biz-1',
          planId: 'plan-1',
          userId: 'user-1',
        }),
      ).rejects.toThrow('El plan es gratuito, no requiere pago');
    });

    it('throws when business is not found', async () => {
      prisma.plan.findUnique.mockResolvedValue({
        id: 'plan-1',
        price: '29.99',
        isActive: true,
      });
      prisma.business.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession({
          businessId: 'non-existent',
          planId: 'plan-1',
          userId: 'user-1',
        }),
      ).rejects.toThrow('Negocio no encontrado');
    });
  });

  // ── handleWebhook ──────────────────────────────────────────────────────

  describe('handleWebhook', () => {
    beforeEach(async () => {
      await buildService();
    });

    it('processes checkout.session.completed event', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { businessId: 'biz-1', planId: 'plan-1' },
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      };
      (service as any).stripe.webhooks.constructEvent.mockReturnValue(event);

      prisma.subscription.findUnique
        .mockResolvedValueOnce(null); // No existing sub → create

      const result = await service.handleWebhook('fake-sig', Buffer.from('{}'));

      expect(result).toEqual({ received: true });
      expect((service as any).stripe.subscriptions.retrieve).toHaveBeenCalledWith('sub_123');
      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: 'biz-1',
            planId: 'plan-1',
            stripeSubscriptionId: 'sub_123',
          }),
        }),
      );
    });

    it('logs warning when checkout.session.completed metadata is missing businessId', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {}, // no businessId
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      };
      (service as any).stripe.webhooks.constructEvent.mockReturnValue(event);

      const result = await service.handleWebhook('fake-sig', Buffer.from('{}'));

      expect(result).toEqual({ received: true });
      expect(prisma.subscription.create).not.toHaveBeenCalled();
      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('updates existing subscription on checkout.session.completed', async () => {
      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { businessId: 'biz-1', planId: 'plan-1' },
            subscription: 'sub_123',
            customer: 'cus_123',
          },
        },
      };
      (service as any).stripe.webhooks.constructEvent.mockReturnValue(event);

      prisma.subscription.findUnique
        .mockResolvedValueOnce({ id: 'sub-local', businessId: 'biz-1' }); // Existing

      await service.handleWebhook('fake-sig', Buffer.from('{}'));

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1' },
          data: expect.objectContaining({
            planId: 'plan-1',
            stripeSubscriptionId: 'sub_123',
            cancelledAt: null,
          }),
        }),
      );
    });

    it('processes customer.subscription.updated with businessId in metadata', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'past_due',
            metadata: { businessId: 'biz-1' },
            current_period_start: Math.floor(Date.now() / 1000) - 86400,
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      };
      (service as any).stripe.webhooks.constructEvent.mockReturnValue(event);

      await service.handleWebhook('fake-sig', Buffer.from('{}'));

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1' },
          data: expect.objectContaining({ status: 'PAST_DUE' }),
        }),
      );
    });

    it('processes customer.subscription.updated without metadata by looking up local sub', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            status: 'active',
            metadata: {}, // no businessId
            current_period_start: Math.floor(Date.now() / 1000) - 86400,
            current_period_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      };
      (service as any).stripe.webhooks.constructEvent.mockReturnValue(event);

      prisma.subscription.findFirst.mockResolvedValue({
        businessId: 'biz-1',
        stripeSubscriptionId: 'sub_123',
      });

      await service.handleWebhook('fake-sig', Buffer.from('{}'));

      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: 'sub_123' },
      });
    });

    it('warns and returns early when metadata lookup fails in subscription.updated', async () => {
      const event = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            metadata: {},
          },
        },
      };
      (service as any).stripe.webhooks.constructEvent.mockReturnValue(event);

      prisma.subscription.findFirst.mockResolvedValue(null);

      // Should not throw, just log warning
      const result = await service.handleWebhook('fake-sig', Buffer.from('{}'));
      expect(result).toEqual({ received: true });
    });

    it('processes customer.subscription.deleted event', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
          },
        },
      };
      (service as any).stripe.webhooks.constructEvent.mockReturnValue(event);

      prisma.subscription.findFirst.mockResolvedValue({
        businessId: 'biz-1',
        stripeSubscriptionId: 'sub_123',
      });

      await service.handleWebhook('fake-sig', Buffer.from('{}'));

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1' },
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('warns when no local subscription found for deleted event', async () => {
      const event = {
        type: 'customer.subscription.deleted',
        data: {
          object: { id: 'sub_unknown' },
        },
      };
      (service as any).stripe.webhooks.constructEvent.mockReturnValue(event);

      prisma.subscription.findFirst.mockResolvedValue(null);

      const result = await service.handleWebhook('fake-sig', Buffer.from('{}'));
      expect(result).toEqual({ received: true });
    });

    it('processes invoice.payment_failed event', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            subscription: 'sub_123',
          },
        },
      };
      (service as any).stripe.webhooks.constructEvent.mockReturnValue(event);

      prisma.subscription.findFirst.mockResolvedValue({
        businessId: 'biz-1',
      });

      await service.handleWebhook('fake-sig', Buffer.from('{}'));

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1' },
          data: expect.objectContaining({ status: 'PAST_DUE' }),
        }),
      );
    });

    it('handles invoice.payment_failed without subscription reference', async () => {
      const event = {
        type: 'invoice.payment_failed',
        data: {
          object: {}, // no subscription field
        },
      };
      (service as any).stripe.webhooks.constructEvent.mockReturnValue(event);

      const result = await service.handleWebhook('fake-sig', Buffer.from('{}'));
      expect(result).toEqual({ received: true });
    });

    it('handles unhandled event types gracefully', async () => {
      const event = { type: 'charge.succeeded', data: { object: {} } };
      (service as any).stripe.webhooks.constructEvent.mockReturnValue(event);

      const result = await service.handleWebhook('fake-sig', Buffer.from('{}'));
      expect(result).toEqual({ received: true });
    });

    it('throws on invalid webhook signature', async () => {
      (service as any).stripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(
        service.handleWebhook('bad-sig', Buffer.from('{}')),
      ).rejects.toThrow('Invalid signature');
    });
  });

  // ── syncSubscription ──────────────────────────────────────────────────

  describe('syncSubscription', () => {
    beforeEach(async () => {
      await buildService();
    });

    it('syncs subscription status from Stripe', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        businessId: 'biz-1',
        stripeSubscriptionId: 'sub_123',
      });

      await service.syncSubscription('biz-1');

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1' },
          data: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('returns early when no stripeSubscriptionId exists', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        businessId: 'biz-1',
        stripeSubscriptionId: null,
      });

      await service.syncSubscription('biz-1');

      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('returns early when no subscription exists', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);

      await service.syncSubscription('biz-1');

      expect(prisma.subscription.update).not.toHaveBeenCalled();
    });

    it('handles Stripe API errors gracefully (logs warning)', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        businessId: 'biz-1',
        stripeSubscriptionId: 'sub_123',
      });

      (service as any).stripe.subscriptions.retrieve.mockRejectedValue(
        new Error('API error'),
      );

      // Should not throw
      await expect(service.syncSubscription('biz-1')).resolves.toBeUndefined();
    });
  });

  // ── createPortalSession ───────────────────────────────────────────────

  describe('createPortalSession', () => {
    beforeEach(async () => {
      await buildService();
    });

    it('creates a billing portal session and returns URL', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        businessId: 'biz-1',
        stripeCustomerId: 'cus_123',
      });

      const result = await service.createPortalSession('biz-1');
      expect(result).toEqual({ url: 'https://billing.stripe.com/session_123' });
    });

    it('throws when no stripeCustomerId exists', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        businessId: 'biz-1',
        stripeCustomerId: null,
      });

      await expect(
        service.createPortalSession('biz-1'),
      ).rejects.toThrow('No hay cliente de Stripe asociado a esta cuenta');
    });

    it('throws when no subscription exists', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);

      await expect(
        service.createPortalSession('biz-1'),
      ).rejects.toThrow('No hay cliente de Stripe asociado a esta cuenta');
    });
  });

  // ── mapStripeStatus (private, tested via behavior) ────────────────────

  describe('mapStripeStatus (via syncSubscription)', () => {
    beforeEach(async () => {
      await buildService();
    });

    const cases: Array<[string, string]> = [
      ['active', 'ACTIVE'],
      ['past_due', 'PAST_DUE'],
      ['canceled', 'CANCELLED'],
      ['incomplete', 'EXPIRED'],
      ['incomplete_expired', 'EXPIRED'],
      ['trialing', 'TRIALING'],
      ['paused', 'PAST_DUE'],
      ['unpaid', 'PAST_DUE'],
    ];

    it.each(cases)('maps Stripe status %s to %s', async (stripeStatus, expected) => {
      prisma.subscription.findUnique.mockResolvedValue({
        businessId: 'biz-1',
        stripeSubscriptionId: 'sub_123',
      });

      (service as any).stripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_123',
        status: stripeStatus,
        metadata: {},
        current_period_start: Math.floor(Date.now() / 1000) - 86400,
        current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      });

      await service.syncSubscription('biz-1');

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: expected }),
        }),
      );
    });
  });
});
