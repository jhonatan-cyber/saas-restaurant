import { Test, TestingModule } from '@nestjs/testing';
import { CashFoundationService } from './cash-foundation.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  createMockPrisma,
} from '../test/mocks';

describe('CashFoundationService', () => {
  let service: CashFoundationService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CashFoundationService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
      ],
    }).compile();
    service = module.get(CashFoundationService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findOpenCashAndShift', () => {
    it('returns cashRegisterId and shiftId when both are open', async () => {
      prisma.mockPrisma.cashRegister.findFirst.mockResolvedValue({ id: 'cr-1' });
      prisma.mockPrisma.shift.findFirst.mockResolvedValue({ id: 'shift-1' });

      const result = await service.findOpenCashAndShift('branch-1');

      expect(result).toEqual({ cashRegisterId: 'cr-1', shiftId: 'shift-1' });
    });

    it('returns null when no open cash register', async () => {
      prisma.mockPrisma.cashRegister.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.shift.findFirst.mockResolvedValue({ id: 'shift-1' });

      const result = await service.findOpenCashAndShift('branch-1');

      expect(result).toBeNull();
    });

    it('returns null when no open shift', async () => {
      prisma.mockPrisma.cashRegister.findFirst.mockResolvedValue({ id: 'cr-1' });
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(null);

      const result = await service.findOpenCashAndShift('branch-1');

      expect(result).toBeNull();
    });

    it('returns null when both are missing', async () => {
      prisma.mockPrisma.cashRegister.findFirst.mockResolvedValue(null);
      prisma.mockPrisma.shift.findFirst.mockResolvedValue(null);

      const result = await service.findOpenCashAndShift('branch-1');

      expect(result).toBeNull();
    });
  });

  describe('findOpenCashAndShiftInTx', () => {
    it('returns IDs when both are open using txClient', async () => {
      const txClient = {
        cashRegister: { findFirst: jest.fn().mockResolvedValue({ id: 'cr-1' }) },
        shift: { findFirst: jest.fn().mockResolvedValue({ id: 'shift-1' }) },
      } as any;

      const result = await service.findOpenCashAndShiftInTx(txClient, 'branch-1');

      expect(result).toEqual({ cashRegisterId: 'cr-1', shiftId: 'shift-1' });
    });

    it('returns null when either is missing in tx', async () => {
      const txClient = {
        cashRegister: { findFirst: jest.fn().mockResolvedValue(null) },
        shift: { findFirst: jest.fn().mockResolvedValue({ id: 'shift-1' }) },
      } as any;

      const result = await service.findOpenCashAndShiftInTx(txClient, 'branch-1');

      expect(result).toBeNull();
    });
  });
});
