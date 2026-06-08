import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import {
  createMockPrisma,
  createMockQueue,
  createTestUser,
  createTestContext,
} from '../test/mocks';
import type { RequestReportDto } from './dto/report.dto';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let queue: ReturnType<typeof createMockQueue>;

  const user = createTestUser();
  const context = createTestContext();

  const baseReport = {
    id: 'rep-1',
    businessId: 'biz-1',
    requestedBy: 'user-1',
    type: 'SALES_DAILY' as const,
    format: 'PDF' as const,
    status: 'COMPLETED' as const,
    params: { dateFrom: '2025-01-01' },
    resultUrl: null,
    error: null,
    completedAt: new Date('2025-01-02'),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };

  beforeEach(async () => {
    prisma = createMockPrisma();
    queue = createMockQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
        { provide: getQueueToken('reports'), useValue: queue },
      ],
    }).compile();

    service = module.get(ReportsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('returns paginated reports', async () => {
      prisma.mockPrisma.report.count.mockResolvedValue(1);
      prisma.mockPrisma.report.findMany.mockResolvedValue([baseReport]);

      const result = await service.list(user, context, { page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('filters by status and type', async () => {
      prisma.mockPrisma.report.count.mockResolvedValue(0);
      prisma.mockPrisma.report.findMany.mockResolvedValue([]);

      await service.list(user, context, { status: 'COMPLETED', type: 'SALES_DAILY', page: 1, pageSize: 20 });

      const where = prisma.mockPrisma.report.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('COMPLETED');
      expect(where.type).toBe('SALES_DAILY');
    });
  });

  describe('getById', () => {
    it('returns report when found', async () => {
      prisma.mockPrisma.report.findFirst.mockResolvedValue(baseReport);

      const result = await service.getById(user, context, 'rep-1');

      expect(result.id).toBe('rep-1');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.mockPrisma.report.findFirst.mockResolvedValue(null);
      await expect(service.getById(user, context, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('request', () => {
    const requestDto: RequestReportDto = {
      type: 'SALES_DAILY',
      format: 'PDF',
      params: { dateFrom: '2025-01-01' },
    };

    it('creates a PENDING report and enqueues it', async () => {
      prisma.mockPrisma.report.create.mockResolvedValue(baseReport);

      const result = await service.request(user, context, requestDto);

      expect(result.id).toBe('rep-1');
      expect(queue.add).toHaveBeenCalledWith(
        'SALES_DAILY',
        expect.objectContaining({ reportId: 'rep-1' }),
        expect.any(Object),
      );
    });

    it('does not throw if queue is unavailable (fire & forget)', async () => {
      prisma.mockPrisma.report.create.mockResolvedValue(baseReport);
      queue.add.mockRejectedValue(new Error('Redis down'));

      const result = await service.request(user, context, requestDto);

      expect(result.id).toBe('rep-1');
    });
  });
});
