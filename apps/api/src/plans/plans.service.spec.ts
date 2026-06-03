import { Test, TestingModule } from '@nestjs/testing';
import { PlansService } from './plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createMockPrisma, decimal } from '../test/mocks';

describe('PlansService', () => {
  let service: PlansService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
      ],
    }).compile();

    service = module.get(PlansService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockPlan = {
    id: 'plan-1',
    code: 'BASIC',
    name: 'Basic Plan',
    description: null,
    price: decimal(29.99),
    currency: 'USD',
    billingPeriod: 'MONTHLY',
    maxUsers: 5,
    maxBranches: 1,
    maxProducts: 50,
    maxCategories: 10,
    maxMonthlyOrders: 500,
    maxStorageMb: 100,
    features: ['pos', 'kds'],
    isActive: true,
    isPublic: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('create', () => {
    it('creates a plan with uppercase code', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(null);
      prisma.mockPrisma.plan.create.mockResolvedValue(mockPlan);

      const result = await service.create({
        code: 'basic',
        name: 'Basic Plan',
        price: decimal(29.99),
        currency: 'USD',
        billingPeriod: 'MONTHLY' as any,
        maxUsers: 5,
        maxBranches: 1,
        maxProducts: 50,
        maxCategories: 10,
        maxMonthlyOrders: 500,
        maxStorageMb: 100,
      });

      expect(prisma.mockPrisma.plan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            code: 'BASIC', // uppercase
          }),
        }),
      );
      expect(result).toEqual(mockPlan);
    });

    it('throws if code already exists', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(mockPlan);

      await expect(
        service.create({
          code: 'BASIC',
          name: 'Duplicate',
          price: decimal(10),
          currency: 'USD',
          billingPeriod: 'MONTHLY' as any,
          maxUsers: 1,
          maxBranches: 1,
          maxProducts: 1,
          maxCategories: 1,
          maxMonthlyOrders: 1,
          maxStorageMb: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('list', () => {
    it('returns paginated results', async () => {
      prisma.mockPrisma.plan.findMany.mockResolvedValue([mockPlan]);
      prisma.mockPrisma.plan.count.mockResolvedValue(1);

      const result = await service.list({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('applies search filter', async () => {
      prisma.mockPrisma.plan.findMany.mockResolvedValue([]);
      prisma.mockPrisma.plan.count.mockResolvedValue(0);

      await service.list({ search: 'Basic' });

      expect(prisma.mockPrisma.plan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: { contains: 'Basic' } }),
            ]),
          }),
        }),
      );
    });
  });

  describe('listPublic', () => {
    it('returns only active public plans', async () => {
      prisma.mockPrisma.plan.findMany.mockResolvedValue([mockPlan]);

      const result = await service.listPublic();

      expect(prisma.mockPrisma.plan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, isPublic: true },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getById', () => {
    it('returns plan by id', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(mockPlan);

      const result = await service.getById('plan-1');
      expect(result).toEqual(mockPlan);
    });

    it('throws NotFoundException if not found', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates plan fields', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(mockPlan);
      prisma.mockPrisma.plan.findUnique.mockResolvedValueOnce(mockPlan);
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(null); // no duplicate code
      prisma.mockPrisma.plan.update.mockResolvedValue({ ...mockPlan, name: 'Updated' });

      const result = await service.update('plan-1', { name: 'Updated' });

      expect(prisma.mockPrisma.plan.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated');
    });

    it('throws NotFoundException if plan not found', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'Nope' })).rejects.toThrow(NotFoundException);
    });

    it('throws if code conflicts with another plan', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(mockPlan);
      prisma.mockPrisma.plan.findUnique.mockResolvedValueOnce(mockPlan);
      // Second findUnique (for duplicate check) returns a DIFFERENT plan
      prisma.mockPrisma.plan.findUnique.mockResolvedValue({ ...mockPlan, id: 'plan-2' });

      await expect(service.update('plan-1', { code: 'BASIC' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('soft-deactivates plan with subscriptions', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(mockPlan);
      prisma.mockPrisma.subscription.count.mockResolvedValue(1);
      prisma.mockPrisma.plan.update.mockResolvedValue({ ...mockPlan, isActive: false });

      const result = await service.remove('plan-1');

      expect(prisma.mockPrisma.plan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: false },
        }),
      );
      expect(result.isActive).toBe(false);
    });

    it('hard-deletes plan without subscriptions', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(mockPlan);
      prisma.mockPrisma.subscription.count.mockResolvedValue(0);
      prisma.mockPrisma.plan.delete.mockResolvedValue(mockPlan);

      const result = await service.remove('plan-1');

      expect(prisma.mockPrisma.plan.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'plan-1' } }),
      );
      expect(result.deleted).toBe(true);
    });

    it('throws NotFoundException if plan not found', async () => {
      prisma.mockPrisma.plan.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
