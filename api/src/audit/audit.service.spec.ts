import { AuditService } from './audit.service';
import { AuditAction } from '@prisma/client';
import { buildServiceTest, MockPrisma } from '../test/service-test.helper';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    const result = await buildServiceTest(AuditService);
    service = result.service;
    prisma = result.prisma;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('log', () => {
    it('creates an audit log entry', async () => {
      prisma.mockPrisma.auditLog.create.mockResolvedValue({
        id: 'log-1',
        businessId: 'biz-1',
        userId: 'user-1',
        action: AuditAction.UPDATE,
        entity: 'Order',
        entityId: 'order-1',
        before: null,
        after: { status: 'PAID' },
        metadata: {},
        createdAt: new Date(),
      });

      await service.log({
        businessId: 'biz-1',
        userId: 'user-1',
        action: AuditAction.UPDATE,
        entity: 'Order',
        entityId: 'order-1',
        before: { status: 'DELIVERED' },
        after: { status: 'PAID' },
      });

      const callArg = prisma.mockPrisma.auditLog.create.mock.calls[0][0];
      expect(callArg.data).toMatchObject({
        businessId: 'biz-1',
        userId: 'user-1',
        action: AuditAction.UPDATE,
        entity: 'Order',
        entityId: 'order-1',
        before: { status: 'DELIVERED' },
        after: { status: 'PAID' },
      });
      // metadata is set to Prisma.JsonNull (special object) when not provided
      expect(callArg.data.metadata?.constructor?.name).toBe('JsonNull');
    });

    it('uses transaction client when passed', async () => {
      const mockTx = { auditLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) } };

      await service.log(
        {
          businessId: 'biz-1',
          userId: 'user-1',
          action: AuditAction.CREATE,
          entity: 'Product',
          entityId: 'prod-1',
        },
        mockTx as any,
      );

      expect(mockTx.auditLog.create).toHaveBeenCalled();
      expect(prisma.mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('uses global client when no tx passed', async () => {
      prisma.mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      await service.log({
        businessId: 'biz-1',
        userId: 'user-1',
        action: AuditAction.CREATE,
        entity: 'User',
        entityId: 'user-1',
      });

      expect(prisma.mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('query', () => {
    const mockRows = [
      { id: 'log-1', createdAt: new Date(), userId: 'user-1', entity: 'Order', entityId: 'order-1', action: AuditAction.UPDATE, before: {}, after: {} },
    ];

    it('returns paginated results', async () => {
      prisma.mockPrisma.auditLog.count.mockResolvedValue(1);
      prisma.mockPrisma.auditLog.findMany.mockResolvedValue(mockRows);

      const result = await service.query({
        businessId: 'biz-1',
        page: 1,
        pageSize: 20,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('applies entity filter', async () => {
      prisma.mockPrisma.auditLog.count.mockResolvedValue(0);
      prisma.mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.query({
        businessId: 'biz-1',
        entity: 'Product',
      });

      expect(prisma.mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            entity: 'Product',
          }),
        }),
      );
    });

    it('applies action filter', async () => {
      prisma.mockPrisma.auditLog.count.mockResolvedValue(0);
      prisma.mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await service.query({
        businessId: 'biz-1',
        action: AuditAction.PAYMENT,
      });

      expect(prisma.mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: AuditAction.PAYMENT,
          }),
        }),
      );
    });
  });
});
