import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { QuotaEnforcer } from './quota.enforcer';

describe('QuotaEnforcer', () => {
  let enforcer: QuotaEnforcer;
  let prisma: any;

  const mockFreePlan = {
    code: 'FREE',
    maxUsers: 3,
    maxBranches: 1,
    maxProducts: 50,
    maxCategories: 10,
    maxMonthlyOrders: 500,
    maxStorageMb: 100,
  };

  const mockProPlan = {
    code: 'PRO',
    maxUsers: 50,
    maxBranches: 5,
    maxProducts: 500,
    maxCategories: 50,
    maxMonthlyOrders: 10000,
    maxStorageMb: 1024,
  };

  beforeEach(async () => {
    prisma = {
      subscription: {
        findUnique: jest.fn(),
      },
      plan: {
        findUnique: jest.fn(),
      },
      business: {
        findUnique: jest.fn(),
      },
      user: {
        count: jest.fn(),
      },
      branch: {
        count: jest.fn(),
      },
      product: {
        count: jest.fn(),
      },
      category: {
        count: jest.fn(),
      },
      order: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotaEnforcer,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    enforcer = module.get(QuotaEnforcer);
  });

  // ── check ─────────────────────────────────────────────────────────────

  describe('check', () => {
    describe('users', () => {
      it('returns allowed=true when current < maxUsers', async () => {
        mockActiveSubscription(mockFreePlan);
        prisma.user.count.mockResolvedValue(2);
        prisma.business.findUnique.mockResolvedValue({ overrideMaxUsers: null });

        const result = await enforcer.check('biz-1', 'users');

        expect(result).toEqual({
          allowed: true,
          current: 2,
          limit: 3,
          resource: 'users',
        });
      });

      it('returns allowed=false when current >= maxUsers', async () => {
        mockActiveSubscription(mockFreePlan);
        prisma.user.count.mockResolvedValue(3);
        prisma.business.findUnique.mockResolvedValue({ overrideMaxUsers: null });

        const result = await enforcer.check('biz-1', 'users');

        expect(result.allowed).toBe(false);
        expect(result.current).toBe(3);
        expect(result.limit).toBe(3);
      });

      it('excludes INACTIVE users from count', async () => {
        mockActiveSubscription(mockFreePlan);
        prisma.user.count.mockResolvedValue(0);
        prisma.business.findUnique.mockResolvedValue({ overrideMaxUsers: null });

        await enforcer.check('biz-1', 'users');

        expect(prisma.user.count).toHaveBeenCalledWith({
          where: { businessId: 'biz-1', status: { not: 'INACTIVE' } },
        });
      });

      it('uses overrideMaxUsers when set on Business', async () => {
        mockActiveSubscription(mockFreePlan);
        prisma.user.count.mockResolvedValue(10);
        prisma.business.findUnique.mockResolvedValue({ overrideMaxUsers: 20 });

        const result = await enforcer.check('biz-1', 'users');

        expect(result.limit).toBe(20);
        expect(result.allowed).toBe(true);
      });

      it('uses plan maxUsers when overrideMaxUsers is null', async () => {
        mockActiveSubscription(mockFreePlan);
        prisma.user.count.mockResolvedValue(2);
        prisma.business.findUnique.mockResolvedValue({ overrideMaxUsers: null });

        const result = await enforcer.check('biz-1', 'users');

        expect(result.limit).toBe(3); // from FREE plan
      });
    });

    describe('branches', () => {
      it('counts only ACTIVE branches', async () => {
        mockActiveSubscription(mockFreePlan);
        prisma.branch.count.mockResolvedValue(1);

        await enforcer.check('biz-1', 'branches');

        expect(prisma.branch.count).toHaveBeenCalledWith({
          where: { businessId: 'biz-1', status: 'ACTIVE' },
        });
      });

      it('returns allowed=true when current < maxBranches', async () => {
        mockActiveSubscription(mockFreePlan);
        prisma.branch.count.mockResolvedValue(0);

        const result = await enforcer.check('biz-1', 'branches');

        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(1);
      });
    });

    describe('products', () => {
      it('counts only non-deleted products', async () => {
        mockActiveSubscription(mockProPlan);
        prisma.product.count.mockResolvedValue(100);

        await enforcer.check('biz-1', 'products');

        expect(prisma.product.count).toHaveBeenCalledWith({
          where: { businessId: 'biz-1', deletedAt: null },
        });
      });

      it('returns allowed=true when current < maxProducts', async () => {
        mockActiveSubscription(mockProPlan);
        prisma.product.count.mockResolvedValue(499);

        const result = await enforcer.check('biz-1', 'products');

        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(500);
      });
    });

    describe('categories', () => {
      it('counts only non-deleted categories', async () => {
        mockActiveSubscription(mockProPlan);
        prisma.category.count.mockResolvedValue(5);

        await enforcer.check('biz-1', 'categories');

        expect(prisma.category.count).toHaveBeenCalledWith({
          where: { businessId: 'biz-1', deletedAt: null },
        });
      });
    });

    describe('monthlyOrders', () => {
      it('counts orders from start of current month', async () => {
        mockActiveSubscription(mockFreePlan);
        prisma.order.count.mockResolvedValue(200);

        await enforcer.check('biz-1', 'monthlyOrders');

        expect(prisma.order.count).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              businessId: 'biz-1',
              createdAt: expect.objectContaining({ gte: expect.any(Date) }),
            }),
          }),
        );
      });

      it('uses gte filter with start of month date', async () => {
        mockActiveSubscription(mockFreePlan);
        prisma.order.count.mockResolvedValue(200);

        await enforcer.check('biz-1', 'monthlyOrders');

        const callArg = prisma.order.count.mock.calls[0][0];
        const gteDate = callArg.where.createdAt.gte;
        expect(gteDate.getDate()).toBe(1);
        expect(gteDate.getHours()).toBe(0);
        expect(gteDate.getMinutes()).toBe(0);
      });
    });
  });

  // ── checkOrThrow ─────────────────────────────────────────────────────

  describe('checkOrThrow', () => {
    it('returns result when within limit', async () => {
      mockActiveSubscription(mockFreePlan);
      prisma.user.count.mockResolvedValue(2);
      prisma.business.findUnique.mockResolvedValue({ overrideMaxUsers: null });

      const result = await enforcer.checkOrThrow('biz-1', 'users');

      expect(result.allowed).toBe(true);
    });

    it('throws ForbiddenException when limit exceeded', async () => {
      mockActiveSubscription(mockFreePlan);
      prisma.user.count.mockResolvedValue(3);
      prisma.business.findUnique.mockResolvedValue({ overrideMaxUsers: null });

      await expect(enforcer.checkOrThrow('biz-1', 'users')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('includes resource name and counts in error message', async () => {
      mockActiveSubscription(mockFreePlan);
      prisma.branch.count.mockResolvedValue(1);
      prisma.user.count.mockResolvedValue(3);
      prisma.business.findUnique.mockResolvedValue({ overrideMaxUsers: null });

      await expect(enforcer.checkOrThrow('biz-1', 'users')).rejects.toThrow(
        'Límite del plan excedido: máximo 3 users. Actual: 3.',
      );
    });
  });

  // ── getEffectivePlan (private, tested via behavior) ───────────────────

  describe('plan resolution (via behavior)', () => {
    it('uses subscription plan when active and not CANCELLED', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        status: 'ACTIVE',
        plan: mockProPlan,
      });
      prisma.product.count.mockResolvedValue(100);

      const result = await enforcer.check('biz-1', 'products');

      expect(result.limit).toBe(500);
    });

    it('uses subscription plan when TRIALING', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        status: 'TRIALING',
        plan: mockProPlan,
      });
      prisma.product.count.mockResolvedValue(100);

      const result = await enforcer.check('biz-1', 'products');

      expect(result.limit).toBe(500);
    });

    it('uses subscription plan when PAST_DUE', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        status: 'PAST_DUE',
        plan: mockProPlan,
      });
      prisma.product.count.mockResolvedValue(100);

      const result = await enforcer.check('biz-1', 'products');

      expect(result.limit).toBe(500);
    });

    it('falls back to FREE plan when subscription is CANCELLED', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        status: 'CANCELLED',
        plan: mockProPlan,
      });
      prisma.plan.findUnique.mockResolvedValue(mockFreePlan);
      prisma.product.count.mockResolvedValue(30);

      const result = await enforcer.check('biz-1', 'products');

      expect(result.limit).toBe(50); // FREE plan limit
    });

    it('falls back to FREE plan when subscription is EXPIRED', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        status: 'EXPIRED',
        plan: mockProPlan,
      });
      prisma.plan.findUnique.mockResolvedValue(mockFreePlan);
      prisma.product.count.mockResolvedValue(30);

      const result = await enforcer.check('biz-1', 'products');

      expect(result.limit).toBe(50);
    });

    it('falls back to FREE plan when no subscription exists', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.plan.findUnique.mockResolvedValue(mockFreePlan);
      prisma.user.count.mockResolvedValue(1);
      prisma.business.findUnique.mockResolvedValue({ overrideMaxUsers: null });

      const result = await enforcer.check('biz-1', 'users');

      expect(result.limit).toBe(3);
    });

    it('uses default limits when no subscription and no FREE plan exists', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.plan.findUnique.mockResolvedValue(null); // No FREE plan
      prisma.user.count.mockResolvedValue(1);
      prisma.business.findUnique.mockResolvedValue({ overrideMaxUsers: null });

      const result = await enforcer.check('biz-1', 'users');

      expect(result.limit).toBe(3); // default
      expect(result.allowed).toBe(true);
    });

    it('uses default limits for all resources when no FREE plan', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.plan.findUnique.mockResolvedValue(null);
      prisma.branch.count.mockResolvedValue(0);

      const result = await enforcer.check('biz-1', 'branches');

      expect(result.limit).toBe(1); // default
    });
  });

  // ── Helpers ─────────────────────────────────────────────────────────

  function mockActiveSubscription(plan: any) {
    prisma.subscription.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      plan,
    });
  }
});
