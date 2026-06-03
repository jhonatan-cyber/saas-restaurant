import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CashFoundationService } from '../cash-foundation/cash-foundation.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createMockPrisma, createMockAudit, createMockCashFoundation, decimal } from '../test/mocks';
import { OrderStatus } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let audit: ReturnType<typeof createMockAudit>;
  let cash: ReturnType<typeof createMockCashFoundation>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    audit = createMockAudit();
    cash = createMockCashFoundation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma.mockPrisma },
        { provide: AuditService, useValue: audit },
        { provide: CashFoundationService, useValue: cash },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const baseOrder = {
    id: 'order-1',
    businessId: 'biz-1',
    branchId: 'branch-1',
    status: 'DELIVERED' as OrderStatus,
    total: decimal(100),
    subtotal: decimal(85.47),
    taxTotal: decimal(14.53),
    version: 1,
    payments: [],
    tableId: null,
    customerId: null,
    cashierId: 'user-1',
    waiterId: null,
    type: 'DINE_IN',
    channel: 'POS_WEB',
    globalNotes: null,
    cashRegisterId: 'cash-reg-1',
    shiftId: 'shift-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    cancelledAt: null,
    cancelledByUserId: null,
    cancellationReason: null,
  };

  const dto = {
    payments: [{ method: 'CASH' as const, amount: '100.00', tendered: '150.00' }],
  };

  describe('payOrder', () => {
    it('processes payment and transitions order to PAID', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      prisma.mockPrisma.payment.create.mockResolvedValue({
        id: 'payment-1',
        businessId: 'biz-1',
        orderId: 'order-1',
        method: 'CASH',
        amount: decimal(100),
        tendered: decimal(150),
        change: decimal(50),
        reference: null,
        cashierId: 'user-1',
        createdAt: new Date(),
      });
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder,
        status: 'PAID' as OrderStatus,
      });
      prisma.mockPrisma.orderStateLog.create.mockResolvedValue({} as any);

      const result = await service.payOrder({
        businessId: 'biz-1',
        userId: 'user-1',
        orderId: 'order-1',
        dto,
      });

      expect(result.order.status).toBe('PAID');
      expect(result.order.payments).toHaveLength(1);
      expect(result.order.payments[0].method).toBe('CASH');
      expect(result.order.payments[0].change).toBe('50');
    });

    it('throws NotFoundException if order not found', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.payOrder({
          businessId: 'biz-1',
          userId: 'user-1',
          orderId: 'nonexistent',
          dto,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if order already PAID', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue({
        ...baseOrder,
        status: 'PAID' as OrderStatus,
      });

      await expect(
        service.payOrder({
          businessId: 'biz-1',
          userId: 'user-1',
          orderId: 'order-1',
          dto,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException if order status is CANCELLED', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue({
        ...baseOrder,
        status: 'CANCELLED' as OrderStatus,
      });

      await expect(
        service.payOrder({
          businessId: 'biz-1',
          userId: 'user-1',
          orderId: 'order-1',
          dto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if order is not DELIVERED', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue({
        ...baseOrder,
        status: 'PENDING' as OrderStatus,
      });

      await expect(
        service.payOrder({
          businessId: 'biz-1',
          userId: 'user-1',
          orderId: 'order-1',
          dto,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if payment total != order total', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);

      await expect(
        service.payOrder({
          businessId: 'biz-1',
          userId: 'user-1',
          orderId: 'order-1',
          dto: { payments: [{ method: 'CASH' as const, amount: '50.00' }] },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if CASH tendered < amount', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);

      await expect(
        service.payOrder({
          businessId: 'biz-1',
          userId: 'user-1',
          orderId: 'order-1',
          dto: { payments: [{ method: 'CASH' as const, amount: '100.00', tendered: '80.00' }] },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires reference for QR payments', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);

      await expect(
        service.payOrder({
          businessId: 'biz-1',
          userId: 'user-1',
          orderId: 'order-1',
          dto: { payments: [{ method: 'QR' as const, amount: '100.00' }] },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires reference for TRANSFER payments', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);

      await expect(
        service.payOrder({
          businessId: 'biz-1',
          userId: 'user-1',
          orderId: 'order-1',
          dto: { payments: [{ method: 'TRANSFER' as const, amount: '100.00' }] },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires reference for CARD payments', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);

      await expect(
        service.payOrder({
          businessId: 'biz-1',
          userId: 'user-1',
          orderId: 'order-1',
          dto: { payments: [{ method: 'CARD' as const, amount: '100.00' }] },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('processes mixed payments correctly', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      prisma.mockPrisma.payment.create
        .mockResolvedValueOnce({
          id: 'payment-1', method: 'CASH', amount: decimal(50), tendered: decimal(50),
          change: null, reference: null, cashierId: 'user-1',
          businessId: 'biz-1', orderId: 'order-1', createdAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'payment-2', method: 'CARD', amount: decimal(50), tendered: null,
          change: null, reference: 'CARD-123', cashierId: 'user-1',
          businessId: 'biz-1', orderId: 'order-1', createdAt: new Date(),
        });
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder, status: 'PAID' as OrderStatus,
      });
      prisma.mockPrisma.orderStateLog.create.mockResolvedValue({} as any);

      const result = await service.payOrder({
        businessId: 'biz-1',
        userId: 'user-1',
        orderId: 'order-1',
        dto: {
          payments: [
            { method: 'CASH' as const, amount: '50.00' },
            { method: 'CARD' as const, amount: '50.00', reference: 'CARD-123' },
          ],
        },
      });

      expect(result.order.payments).toHaveLength(2);
      expect(result.order.status).toBe('PAID');
    });
  });

  describe('previewChange', () => {
    it('calculates change correctly', () => {
      const result = service.previewChange('100.00', '150.00');
      // Decimal.js toString() doesn't pad: 150-100 = "50"
      expect(result.change).toBe('50');
      expect(result.tendered).toBe('150');
      expect(result.sufficient).toBe(true);
    });

    it('returns insufficient when tendered < total', () => {
      const result = service.previewChange('100.00', '50.00');
      // Negative change switches to literal "0.00"
      expect(result.change).toBe('0.00');
      expect(result.sufficient).toBe(false);
    });

    it('handles exact amount', () => {
      const result = service.previewChange('100.00', '100.00');
      expect(result.change).toBe('0');
      expect(result.sufficient).toBe(true);
    });
  });

  describe('listForOrder', () => {
    it('returns payments for an order', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue({ id: 'order-1' } as any);
      prisma.mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'payment-1', businessId: 'biz-1', orderId: 'order-1',
          method: 'CASH', amount: decimal(100), tendered: decimal(150),
          change: decimal(50), reference: null, cashierId: 'user-1',
          createdAt: new Date(),
        },
      ]);

      const result = await service.listForOrder({
        businessId: 'biz-1',
        orderId: 'order-1',
      });

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe('100');
    });

    it('throws NotFoundException if order not found', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(null);

      await expect(
        service.listForOrder({ businessId: 'biz-1', orderId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
