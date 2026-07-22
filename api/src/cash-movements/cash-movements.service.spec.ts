import { CashMovementsService } from './cash-movements.service';
import { BadRequestException } from '@nestjs/common';
import { decimal } from '../test/mocks';
import { buildServiceTest, MockPrisma, MockAudit } from '../test/service-test.helper';

describe('CashMovementsService', () => {
  let service: CashMovementsService;
  let prisma: MockPrisma;
  let audit: MockAudit;

  const bizId = 'biz-1';
  const userId = 'user-1';

  const openShift = {
    id: 'shift-1', businessId: bizId, branchId: 'branch-1',
    cashRegisterId: 'cr-1', userId, status: 'OPEN' as const,
    openedAt: new Date(), closingAmount: null,
  };

  const baseMovement = {
    id: 'mov-1', businessId: bizId, branchId: 'branch-1',
    shiftId: 'shift-1', type: 'CASH_IN' as const,
    category: 'OTHER_IN' as const, amount: decimal(200),
    reason: 'Depósito', createdByUserId: userId,
    createdAt: new Date(),
    user: { fullName: 'Cajero', email: 'cajero@test.com' },
  };

  beforeEach(async () => {
    const result = await buildServiceTest(CashMovementsService, { audit: true });
    service = result.service;
    prisma = result.prisma;
    audit = result.audit!;
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('creates a CASH_IN with open shift', async () => {
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(openShift);
      prisma.mockPrisma.cashMovement.create.mockResolvedValue(baseMovement);

      const result = await service.create({
        businessId: bizId, userId,
        dto: { branchId: 'branch-1', type: 'CASH_IN', category: 'OTHER_IN', amount: 200 },
      });

      expect(result.amount).toBe('200');
      expect(result.type).toBe('CASH_IN');
      expect(audit!.log).toHaveBeenCalled();
    });

    it('allows owner investment CASH_IN without open shift', async () => {
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(null); // no open shift
      prisma.mockPrisma.cashMovement.create.mockResolvedValue({
        ...baseMovement, shiftId: null,
      });

      const result = await service.create({
        businessId: bizId, userId,
        dto: { branchId: 'branch-1', type: 'CASH_IN', category: 'OWNER_INVESTMENT', amount: 5000 },
      });

      expect(result.amount).toBe('200');
    });

    it('allows loan received CASH_IN without open shift', async () => {
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.cashMovement.create.mockResolvedValue({ ...baseMovement, shiftId: null });

      await service.create({
        businessId: bizId, userId,
        dto: { branchId: 'branch-1', type: 'CASH_IN', category: 'LOAN_RECEIVED', amount: 10000 },
      });

      expect(prisma.mockPrisma.cashMovement.create).toHaveBeenCalled();
    });

    it('throws BadRequestException for CASH_OUT without open shift', async () => {
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(null);

      await expect(service.create({
        businessId: bizId, userId,
        dto: { branchId: 'branch-1', type: 'CASH_OUT', category: 'SUPPLIES', amount: 100 },
      })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for CASH_IN without shift and non-investment category', async () => {
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(null);

      await expect(service.create({
        businessId: bizId, userId,
        dto: { branchId: 'branch-1', type: 'CASH_IN', category: 'OTHER_IN', amount: 200 },
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('list', () => {
    it('returns paginated cash movements with filters', async () => {
      prisma.mockPrisma.cashMovement.count.mockResolvedValue(1);
      prisma.mockPrisma.cashMovement.findMany.mockResolvedValue([baseMovement]);

      const result = await service.list({
        businessId: bizId, page: 1, pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('filters by branchId, shiftId, type, category, dateRange', async () => {
      prisma.mockPrisma.cashMovement.count.mockResolvedValue(0);
      prisma.mockPrisma.cashMovement.findMany.mockResolvedValue([]);

      await service.list({
        businessId: bizId, branchId: 'branch-1', shiftId: 'shift-1',
        type: 'CASH_IN', category: 'OTHER_IN',
        dateFrom: new Date('2025-01-01'), dateTo: new Date('2025-01-31'),
        page: 1, pageSize: 20,
      });

      const where = prisma.mockPrisma.cashMovement.findMany.mock.calls[0][0].where;
      expect(where.branchId).toBe('branch-1');
      expect(where.shiftId).toBe('shift-1');
      expect(where.type).toBe('CASH_IN');
      expect(where.createdAt.gte).toBeDefined();
      expect(where.createdAt.lte).toBeDefined();
    });
  });

  describe('getSummary', () => {
    it('returns totals for IN, OUT, and net', async () => {
      prisma.mockPrisma.cashMovement.aggregate
        .mockResolvedValueOnce({ _sum: { amount: decimal(1000) } } as any) // CASH_IN
        .mockResolvedValueOnce({ _sum: { amount: decimal(400) } } as any); // CASH_OUT
      prisma.mockPrisma.cashMovement.count.mockResolvedValue(5);

      const result = await service.getSummary({
        businessId: bizId, branchId: 'branch-1',
      });

      expect(result.totalIn).toBe('1000');
      expect(result.totalOut).toBe('400');
      expect(result.net).toBe('600');
      expect(result.count).toBe(5);
    });
  });
});
