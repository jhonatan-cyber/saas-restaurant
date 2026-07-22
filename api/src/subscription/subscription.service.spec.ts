import { SubscriptionService } from './subscription.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { decimal } from '../test/mocks';
import { buildServiceTest, MockPrisma } from '../test/service-test.helper';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prisma: MockPrisma;

  const bizId = 'biz-1';
  const planId = 'plan-1';

  const basePlan = {
    id: planId,
    code: 'BASIC',
    name: 'Basic Plan',
    price: decimal(29.99),
    currency: 'USD',
    billingPeriod: 'MONTHLY' as const,
    maxUsers: 5,
    maxBranches: 1,
    maxProducts: 50,
    isActive: true,
    isPublic: true,
    sortOrder: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  const baseSubscription = {
    id: 'sub-1',
    businessId: bizId,
    planId,
    status: 'ACTIVE' as const,
    currentPeriodStart: new Date('2025-01-01'),
    currentPeriodEnd: new Date('2025-02-01'),
    trialEndsAt: null,
    cancelledAt: null,
    plan: basePlan,
  };

  beforeEach(async () => {
    const result = await buildServiceTest(SubscriptionService);
    service = result.service;
    prisma = result.prisma;
  });

  afterEach(() => jest.clearAllMocks());

  describe('getCurrent', () => {
    it('returns subscription with plan', async () => {
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription);

      const result = await service.getCurrent(bizId);

      expect(result!.id).toBe('sub-1');
      expect(result!.plan.id).toBe(planId);
    });

    it('returns null when no subscription exists', async () => {
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue(null);

      const result = await service.getCurrent(bizId);

      expect(result).toBeNull();
    });
  });

  describe('assign', () => {
    it('creates a new subscription with TRIALING status', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(basePlan);
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue(null);
      prisma.mockPrisma.subscription.create.mockResolvedValue({
        ...baseSubscription,
        status: 'TRIALING',
        trialEndsAt: expect.any(Date),
      } as any);

      await service.assign(bizId, planId);

      expect(prisma.mockPrisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: bizId,
            planId,
            status: 'TRIALING',
          }),
        }),
      );
    });

    it('updates existing subscription when business already has one', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(basePlan);
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription);
      prisma.mockPrisma.subscription.update.mockResolvedValue(baseSubscription);

      await service.assign(bizId, planId);

      expect(prisma.mockPrisma.subscription.update).toHaveBeenCalled();
      expect(prisma.mockPrisma.subscription.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when plan not found', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(null);

      await expect(service.assign(bizId, planId)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when plan is not active', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue({ ...basePlan, isActive: false });

      await expect(service.assign(bizId, planId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('cancels an active subscription', async () => {
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription);
      prisma.mockPrisma.subscription.update.mockResolvedValue({
        ...baseSubscription, status: 'CANCELLED', cancelledAt: new Date(),
      });

      const result = await service.cancel(bizId);

      expect(result.status).toBe('CANCELLED');
    });

    it('throws NotFoundException when no subscription exists', async () => {
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await expect(service.cancel(bizId)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when already CANCELLED', async () => {
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue({
        ...baseSubscription, status: 'CANCELLED',
      });

      await expect(service.cancel(bizId)).rejects.toThrow(BadRequestException);
    });
  });
});
