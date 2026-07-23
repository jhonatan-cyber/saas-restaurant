import { AdminService } from './admin.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { buildServiceTest, MockPrisma } from '../test/service-test.helper';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    const result = await buildServiceTest(AdminService);
    service = result.service;
    prisma = result.prisma;
  });

  afterEach(() => jest.clearAllMocks());

  const mockBusiness = {
    id: 'biz-1',
    name: 'Test Restaurant',
    slug: 'test',
    legalName: null,
    taxId: null,
    email: 'test@test.com',
    phone: null,
    logoUrl: null,
    currency: 'ARS',
    timezone: 'UTC',
    status: 'ACTIVE',
    plan: 'BASIC',
    planId: null,
    trialEndsAt: null,
    moduleReports: false,
    moduleInventory: false,
    modulePosStations: false,
    moduleDeliveryApp: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
  };

  const mockSubscription = {
    id: 'sub-1',
    businessId: 'biz-1',
    planId: 'plan-1',
    status: 'ACTIVE',
    currentPeriodStart: new Date('2025-06-01'),
    currentPeriodEnd: new Date('2025-07-01'),
    trialEndsAt: null,
    cancelledAt: null,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
  };

  const mockPlan = {
    id: 'plan-1',
    code: 'BASIC',
    name: 'Basic',
    description: null,
    price: 29.99,
    currency: 'USD',
    billingPeriod: 'MONTHLY',
    maxUsers: 5,
    maxBranches: 1,
    maxProducts: 50,
    maxCategories: 10,
    maxMonthlyOrders: 500,
    maxStorageMb: 100,
    features: ['pos'],
    isActive: true,
    isPublic: true,
    sortOrder: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  // ── Dashboard ──────────────────────────────────────────────────────

  describe('getDashboardStats', () => {
    it('returns aggregated counts', async () => {
      prisma.mockPrisma.business.count.mockResolvedValue(10);
      prisma.mockPrisma.user.count.mockResolvedValue(50);
      prisma.mockPrisma.order.count.mockResolvedValue(200);
      prisma.mockPrisma.subscription.count.mockResolvedValue(8);

      const result = await service.getDashboardStats();

      expect(result).toEqual({
        totalBusinesses: 10,
        totalUsers: 50,
        totalOrders: 200,
        activeSubscriptions: 8,
      });
    });
  });

  // ── List Businesses ────────────────────────────────────────────────

  describe('listBusinesses', () => {
    const businessWithCount = {
      ...mockBusiness,
      subscription: null,
      _count: { users: 3, branches: 2, orders: 50 },
    };

    it('returns paginated businesses without filters', async () => {
      prisma.mockPrisma.business.findMany.mockResolvedValue([businessWithCount]);
      prisma.mockPrisma.business.count.mockResolvedValue(1);

      const result = await service.listBusinesses({ page: 1, pageSize: 20 });

      expect(prisma.mockPrisma.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('filters by search term', async () => {
      prisma.mockPrisma.business.findMany.mockResolvedValue([businessWithCount]);
      prisma.mockPrisma.business.count.mockResolvedValue(1);

      await service.listBusinesses({ page: 1, pageSize: 20, search: 'test' });

      expect(prisma.mockPrisma.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: { contains: 'test' } }),
            ]),
          }),
        }),
      );
    });

    it('filters by status', async () => {
      prisma.mockPrisma.business.findMany.mockResolvedValue([businessWithCount]);
      prisma.mockPrisma.business.count.mockResolvedValue(1);

      await service.listBusinesses({ page: 1, pageSize: 20, status: 'ACTIVE' });

      expect(prisma.mockPrisma.business.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });
  });

  // ── Business Detail ────────────────────────────────────────────────

  describe('getBusinessDetail', () => {
    it('returns business detail with subscription and stats', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue({
        ...mockBusiness,
        subscription: { ...mockSubscription, plan: mockPlan },
        _count: { users: 3, branches: 2, orders: 50, products: 20, customers: 10 },
      });

      const result = await service.getBusinessDetail('biz-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('biz-1');
      expect(result!.subscription?.planCode).toBe('BASIC');
      expect(result!.stats.users).toBe(3);
    });

    it('returns null when business not found', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(null);

      const result = await service.getBusinessDetail('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ── Assign Plan ────────────────────────────────────────────────────

  describe('assignPlan', () => {
    it('creates new subscription when none exists', async () => {
      const mockPlanWithId = { ...mockPlan, id: 'plan-1' };
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(mockPlanWithId);
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue(null);
      prisma.mockPrisma.subscription.create.mockResolvedValue({
        ...mockSubscription,
        plan: mockPlanWithId,
      });

      const result = await service.assignPlan('biz-1', 'plan-1');

      expect(prisma.mockPrisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: 'biz-1',
            planId: 'plan-1',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(result.plan.code).toBe('BASIC');
    });

    it('updates existing subscription', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(mockPlan);
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      prisma.mockPrisma.subscription.update.mockResolvedValue({
        ...mockSubscription,
        plan: mockPlan,
      });

      const result = await service.assignPlan('biz-1', 'plan-1');

      expect(prisma.mockPrisma.subscription.update).toHaveBeenCalled();
      expect(prisma.mockPrisma.subscription.create).not.toHaveBeenCalled();
      expect(result.plan.code).toBe('BASIC');
    });

    it('throws when plan not found', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(null);

      await expect(service.assignPlan('biz-1', 'nonexistent'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws when plan is inactive', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue({ ...mockPlan, isActive: false });

      await expect(service.assignPlan('biz-1', 'plan-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('uses yearly period for YEARLY plans', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue({ ...mockPlan, billingPeriod: 'YEARLY' });
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue(null);
      prisma.mockPrisma.subscription.create.mockResolvedValue({
        ...mockSubscription,
        plan: { ...mockPlan, billingPeriod: 'YEARLY' },
      });

      const result = await service.assignPlan('biz-1', 'plan-1');

      expect(prisma.mockPrisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentPeriodEnd: expect.any(Date),
          }),
        }),
      );
    });
  });

  // ── Cancel Subscription ────────────────────────────────────────────

  describe('cancelSubscription', () => {
    it('cancels active subscription', async () => {
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      prisma.mockPrisma.subscription.update.mockResolvedValue({
        ...mockSubscription,
        status: 'CANCELLED',
        cancelledAt: new Date(),
        plan: mockPlan,
      });

      const result = await service.cancelSubscription('biz-1');

      expect(prisma.mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CANCELLED',
            cancelledAt: expect.any(Date),
          }),
        }),
      );
      expect(result.plan.code).toBe('BASIC');
    });

    it('throws when no subscription exists', async () => {
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await expect(service.cancelSubscription('nonexistent'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws when already cancelled', async () => {
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        status: 'CANCELLED',
      });

      await expect(service.cancelSubscription('biz-1'))
        .rejects.toThrow(BadRequestException);
    });

    it('throws when already expired', async () => {
      prisma.mockPrisma.subscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        status: 'EXPIRED',
      });

      await expect(service.cancelSubscription('biz-1'))
        .rejects.toThrow(BadRequestException);
    });
  });

  // ── Update Business ───────────────────────────────────────────────

  describe('updateBusiness', () => {
    it('updates business name and email', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.mockPrisma.business.update.mockResolvedValue({ ...mockBusiness, name: 'Updated' });

      const result = await service.updateBusiness('biz-1', { name: 'Updated', email: 'new@test.com' });

      expect(prisma.mockPrisma.business.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Updated', email: 'new@test.com' }),
        }),
      );
      expect(result.name).toBe('Updated');
    });

    it('suspends a business', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);
      prisma.mockPrisma.business.update.mockResolvedValue({ ...mockBusiness, status: 'SUSPENDED' });

      const result = await service.updateBusiness('biz-1', { status: 'SUSPENDED' });

      expect(prisma.mockPrisma.business.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SUSPENDED' }),
        }),
      );
      expect(result.status).toBe('SUSPENDED');
    });

    it('throws on invalid status', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(mockBusiness);

      await expect(service.updateBusiness('biz-1', { status: 'INVALID' }))
        .rejects.toThrow(BadRequestException);
    });

    it('throws when business not found', async () => {
      prisma.mockPrisma.business.findUnique.mockResolvedValue(null);

      await expect(service.updateBusiness('nonexistent', { name: 'X' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── SaaS Users ────────────────────────────────────────────────────

  describe('listSaaSUsers', () => {
    it('returns paginated SaaS users', async () => {
      prisma.mockPrisma.saaSUser.findMany.mockResolvedValue([
        { id: 'saas-1', email: 'admin@saas.com', role: 'SUPER_ADMIN', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      ]);
      prisma.mockPrisma.saaSUser.count.mockResolvedValue(1);

      const result = await service.listSaaSUsers(1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('createSaaSUser', () => {
    it('creates a new SaaS user with hashed password', async () => {
      prisma.mockPrisma.saaSUser.findUnique.mockResolvedValue(null);
      prisma.mockPrisma.saaSUser.create.mockResolvedValue({
        id: 'saas-1', email: 'admin@saas.com', role: 'SUPER_ADMIN', isActive: true, createdAt: new Date(),
      });

      const result = await service.createSaaSUser('admin@saas.com', 'Password123!', 'SUPER_ADMIN');

      expect(prisma.mockPrisma.saaSUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'admin@saas.com',
            role: 'SUPER_ADMIN',
            passwordHash: expect.any(String),
          }),
        }),
      );
      expect(result.email).toBe('admin@saas.com');
    });

    it('throws when email already exists', async () => {
      prisma.mockPrisma.saaSUser.findUnique.mockResolvedValue({ id: 'saas-1' } as any);

      await expect(service.createSaaSUser('admin@saas.com', 'pw', 'SUPER_ADMIN'))
        .rejects.toThrow('Ya existe');
    });
  });

  // ── Dashboard Series ──────────────────────────────────────────────

  describe('getDashboardSeries', () => {
    it('returns monthly aggregation', async () => {
      prisma.mockPrisma.business.findMany.mockResolvedValue([{ createdAt: new Date() }]);
      prisma.mockPrisma.order.findMany.mockResolvedValue([{ createdAt: new Date(), total: 100 }]);

      const result = await service.getDashboardSeries();

      expect(result).toHaveLength(6);
      expect(result[result.length - 1]!.businesses).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Audit Logs ────────────────────────────────────────────────────

  describe('listAuditLogs', () => {
    it('returns paginated audit logs', async () => {
      prisma.mockPrisma.auditLog.count.mockResolvedValue(1);
      prisma.mockPrisma.auditLog.findMany.mockResolvedValue([{
        id: 'log-1', createdAt: new Date(), businessId: 'biz-1', userId: 'user-1',
        entity: 'Product', entityId: 'prod-1', action: 'CREATE', metadata: null,
      }]);

      const result = await service.listAuditLogs(1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('filters by action', async () => {
      prisma.mockPrisma.auditLog.count.mockResolvedValue(0);
      prisma.mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.listAuditLogs(1, 20, { action: 'DELETE' });

      expect(prisma.mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ action: 'DELETE' }),
        }),
      );
    });
  });
});
