import { Test, TestingModule } from '@nestjs/testing';
import { CashService } from './cash.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import {
  createMockPrisma,
  createMockAudit,
  decimal,
} from '../test/mocks';

describe('CashService', () => {
  let service: CashService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let audit: ReturnType<typeof createMockAudit>;

  const bizId = 'biz-1';
  const userId = 'user-1';

  const baseRegister = {
    id: 'cr-1', businessId: bizId, branchId: 'branch-1',
    code: 'CAJA-01', status: 'OPEN' as const,
    openedAt: new Date(), closedAt: null,
    openedByUserId: userId, closedByUserId: null,
  };

  const baseShift = {
    id: 'shift-1', businessId: bizId, branchId: 'branch-1',
    cashRegisterId: 'cr-1', userId,
    status: 'OPEN' as const,
    openedAt: new Date(), closedAt: null,
    openingAmount: decimal(500), closingAmount: null,
    expectedAmount: null, difference: null, closingNotes: null,
  };

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = createMockAudit();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = module.get(CashService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('listCashRegisters', () => {
    it('returns cash registers filtered by business', async () => {
      prisma.mockPrisma.cashRegister.findMany.mockResolvedValue([baseRegister]);

      const result = await service.listCashRegisters({ businessId: bizId });

      expect(result).toHaveLength(1);
      expect(result[0]!.code).toBe('CAJA-01');
    });

    it('filters by branchId when provided', async () => {
      prisma.mockPrisma.cashRegister.findMany.mockResolvedValue([]);

      await service.listCashRegisters({ businessId: bizId, branchId: 'branch-1' });

      expect(prisma.mockPrisma.cashRegister.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ branchId: 'branch-1' }),
        }),
      );
    });
  });

  describe('createCashRegister', () => {
    it('creates and audits a cash register', async () => {
      prisma.mockPrisma.cashRegister.create.mockResolvedValue(baseRegister);

      const result = await service.createCashRegister({
        businessId: bizId, branchId: 'branch-1', code: 'CAJA-01', userId,
      });

      expect(result.code).toBe('CAJA-01');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entity: 'CashRegister' }),
      );
    });
  });

  describe('openShift', () => {
    it('opens a shift when validations pass', async () => {
      prisma.mockPrisma.cashRegister.findFirst.mockResolvedValue(baseRegister);
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.shift.create.mockResolvedValue(baseShift);

      const result = await service.openShift({
        businessId: bizId, branchId: 'branch-1',
        cashRegisterId: 'cr-1', userId, openingAmount: 500,
      });

      expect(result.status).toBe('OPEN');
      expect(result.openingAmount).toBe('500');
    });

    it('throws if register not found', async () => {
      prisma.mockPrisma.cashRegister.findFirst.mockResolvedValue(null);

      await expect(service.openShift({
        businessId: bizId, branchId: 'branch-1',
        cashRegisterId: 'invalid', userId, openingAmount: 500,
      })).rejects.toThrow(NotFoundException);
    });

    it('throws if register branch does not match', async () => {
      prisma.mockPrisma.cashRegister.findFirst.mockResolvedValue({
        ...baseRegister, branchId: 'other-branch',
      });

      await expect(service.openShift({
        businessId: bizId, branchId: 'branch-1',
        cashRegisterId: 'cr-1', userId, openingAmount: 500,
      })).rejects.toThrow(BadRequestException);
    });

    it('throws if register is CLOSED', async () => {
      prisma.mockPrisma.cashRegister.findFirst.mockResolvedValue({
        ...baseRegister, status: 'CLOSED',
      });

      await expect(service.openShift({
        businessId: bizId, branchId: 'branch-1',
        cashRegisterId: 'cr-1', userId, openingAmount: 500,
      })).rejects.toThrow(BadRequestException);
    });

    it('throws if user already has an OPEN shift in this register', async () => {
      prisma.mockPrisma.cashRegister.findFirst.mockResolvedValue(baseRegister);
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(baseShift);

      await expect(service.openShift({
        businessId: bizId, branchId: 'branch-1',
        cashRegisterId: 'cr-1', userId, openingAmount: 500,
      })).rejects.toThrow(ConflictException);
    });
  });

  describe('getOpenShift', () => {
    it('returns open shift when found', async () => {
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(baseShift);

      const result = await service.getOpenShift({
        businessId: bizId, userId, branchId: 'branch-1',
      });

      expect(result!.id).toBe('shift-1');
      expect(result!.openingAmount).toBe('500');
    });

    it('returns null when no open shift', async () => {
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(null);

      const result = await service.getOpenShift({
        businessId: bizId, userId, branchId: 'branch-1',
      });

      expect(result).toBeNull();
    });
  });

  describe('computeArqueo', () => {
    it('calculates expected amount from opening + payments + movements', async () => {
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(baseShift);
      prisma.mockPrisma.payment.aggregate.mockResolvedValue({
        _sum: { amount: decimal(300) },
      } as any);
      prisma.mockPrisma.cashMovement.aggregate
        .mockResolvedValueOnce({ _sum: { amount: decimal(100) } } as any) // CASH_IN
        .mockResolvedValueOnce({ _sum: { amount: decimal(50) } } as any); // CASH_OUT

      const result = await service.computeArqueo({ businessId: bizId, shiftId: 'shift-1' });

      expect(result.openingAmount).toBe('500');
      expect(result.cashPaymentsTotal).toBe('300');
      expect(result.cashMovementsInTotal).toBe('100');
      expect(result.cashMovementsOutTotal).toBe('50');
      expect(result.expectedAmount).toBe('850'); // 500 + 300 + 100 - 50
    });

    it('throws if shift not found or not OPEN', async () => {
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(null);

      await expect(service.computeArqueo({ businessId: bizId, shiftId: 'invalid' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('closeShift', () => {
    it('closes shift and calculates difference', async () => {
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(baseShift);
      prisma.mockPrisma.payment.aggregate.mockResolvedValue({
        _sum: { amount: decimal(300) },
      } as any);
      prisma.mockPrisma.cashMovement.aggregate
        .mockResolvedValueOnce({ _sum: { amount: decimal(0) } } as any)
        .mockResolvedValueOnce({ _sum: { amount: decimal(0) } } as any);
      prisma.mockPrisma.order.count.mockResolvedValue(0);
      prisma.mockPrisma.shift.update.mockResolvedValue({
        ...baseShift, status: 'CLOSED', closedAt: new Date(),
        closingAmount: decimal(850), expectedAmount: decimal(800),
        difference: decimal(50),
      });

      const result = await service.closeShift({
        businessId: bizId, shiftId: 'shift-1', userId, closingAmount: 850,
      });

      expect(result.status).toBe('CLOSED');
      expect(audit.log).toHaveBeenCalled();
    });

    it('throws if shift not found or not OPEN', async () => {
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(null);

      await expect(service.closeShift({
        businessId: bizId, shiftId: 'invalid', userId, closingAmount: 0,
      })).rejects.toThrow(NotFoundException);
    });

    it('throws if another user tries to close the shift', async () => {
      prisma.mockPrisma.shift.findFirst.mockResolvedValue({
        ...baseShift, userId: 'other-user',
      });

      await expect(service.closeShift({
        businessId: bizId, shiftId: 'shift-1', userId, closingAmount: 0,
      })).rejects.toThrow(BadRequestException);
    });
  });

  describe('listShifts', () => {
    it('returns paginated shifts with user and register info', async () => {
      prisma.mockPrisma.shift.count.mockResolvedValue(1);
      prisma.mockPrisma.shift.findMany.mockResolvedValue([baseShift]);

      const result = await service.listShifts({
        businessId: bizId, page: 1, pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
