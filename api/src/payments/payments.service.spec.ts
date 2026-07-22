import { PaymentsService } from './payments.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { decimal } from '../test/mocks';
import { buildServiceTest, MockPrisma, MockAudit, MockCash } from '../test/service-test.helper';
import { PrintService } from '../print/print.service';
import { OrderStatus } from '@prisma/client';

const printServiceMock = {
  printTicketForOrder: jest.fn().mockResolvedValue(undefined),
  printComandaForOrder: jest.fn().mockResolvedValue(undefined),
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: MockPrisma;
  let audit: MockAudit;
  let cash: MockCash;

  beforeEach(async () => {
    const result = await buildServiceTest(PaymentsService, {
      audit: true,
      cashFoundation: true,
      extra: [{ provide: PrintService, useValue: printServiceMock }],
    });
    service = result.service;
    prisma = result.prisma;
    audit = result.audit!;
    cash = result.cash!;
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
    payments: [{ method: 'CASH' as const, amount: 100, tendered: 150 }],
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
      prisma.mockTx.orderItem.findMany.mockResolvedValue([]);

      const result = await service.payOrder({
        businessId: 'biz-1',
        userId: 'user-1',
        orderId: 'order-1',
        dto,
      });

      expect(result.order.status).toBe('PAID');
      expect(result.order.payments).toHaveLength(1);
      expect(result.order.payments[0]!.method).toBe('CASH');
      expect(result.order.payments[0]!.change).toBe('50');
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
          dto: { payments: [{ method: 'CASH' as const, amount: 50 }] },
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
          dto: { payments: [{ method: 'CASH' as const, amount: 100, tendered: 80 }] },
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
          dto: { payments: [{ method: 'QR' as const, amount: 100 }] },
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
          dto: { payments: [{ method: 'TRANSFER' as const, amount: 100 }] },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('logs audit on successful payment', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      prisma.mockPrisma.payment.create.mockResolvedValue({
        id: 'payment-1', businessId: 'biz-1', orderId: 'order-1',
        method: 'CASH', amount: decimal(100), tendered: decimal(150), change: decimal(50),
        reference: null, cashierId: 'user-1', createdAt: new Date(),
      });
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder, status: 'PAID' as OrderStatus,
      });
      prisma.mockPrisma.orderStateLog.create.mockResolvedValue({} as any);
      prisma.mockTx.orderItem.findMany.mockResolvedValue([]);

      await service.payOrder({
        businessId: 'biz-1',
        userId: 'user-1',
        orderId: 'order-1',
        dto,
      });

      expect(audit!.log).toHaveBeenCalled();
    });

    it('deducts stock for products with trackStock=true', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      prisma.mockPrisma.payment.create.mockResolvedValue({
        id: 'payment-1', businessId: 'biz-1', orderId: 'order-1',
        method: 'CASH', amount: decimal(100), tendered: decimal(150), change: decimal(50),
        reference: null, cashierId: 'user-1', createdAt: new Date(),
      });
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder, status: 'PAID' as OrderStatus,
      });
      prisma.mockPrisma.orderStateLog.create.mockResolvedValue({} as any);

      // Item with trackStock=true → debe descontar stock
      const orderItem = {
        id: 'item-1', orderId: 'order-1',
        productId: 'prod-1',
        quantity: 2,
        unitPrice: decimal(50),
        lineTotal: decimal(100),
        productName: 'Hamburguesa',
        taxRate: decimal(13),
        preparationAreaId: null,
        preparationAreaName: null,
        notes: null,
        businessId: 'biz-1',
        createdAt: new Date(),
      };
      prisma.mockTx.orderItem.findMany.mockResolvedValue([orderItem]);

      // Product with trackStock=true
      const trackableProduct = {
        id: 'prod-1', name: 'Hamburguesa', trackStock: true, currentStock: decimal(50),
      };
      prisma.mockTx.product.findMany.mockResolvedValue([trackableProduct]);
      prisma.mockTx.inventoryMovement.create.mockResolvedValue({} as any);
      prisma.mockTx.product.update.mockResolvedValue({
        id: 'prod-1', currentStock: decimal(48),
      } as any);

      await service.payOrder({
        businessId: 'biz-1',
        userId: 'user-1',
        orderId: 'order-1',
        dto,
      });

      // Verificar que se creó el movimiento de inventario OUT
      expect(prisma.mockTx.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            productId: 'prod-1',
            type: 'OUT',
            referenceType: 'SALE',
            referenceId: 'item-1',
            quantity: decimal(-2),
            businessId: 'biz-1',
            branchId: 'branch-1',
          }),
        }),
      );

      // Verificar que se actualizó el stock del producto
      expect(prisma.mockTx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: expect.objectContaining({
            currentStock: expect.any(Object), // Prisma.Decimal
          }),
        }),
      );
    });

    it('skips stock deduction for products with trackStock=false', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      prisma.mockPrisma.payment.create.mockResolvedValue({
        id: 'payment-1', businessId: 'biz-1', orderId: 'order-1',
        method: 'CASH', amount: decimal(100), tendered: decimal(150), change: decimal(50),
        reference: null, cashierId: 'user-1', createdAt: new Date(),
      });
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder, status: 'PAID' as OrderStatus,
      });
      prisma.mockPrisma.orderStateLog.create.mockResolvedValue({} as any);

      // Item with productId but trackStock=false → NO debe descontar stock
      const orderItem = {
        id: 'item-1', orderId: 'order-1',
        productId: 'prod-2',
        quantity: 3,
        unitPrice: decimal(33.33),
        lineTotal: decimal(100),
        productName: 'Coca Cola',
        taxRate: decimal(13),
        preparationAreaId: null,
        preparationAreaName: null,
        notes: null,
        businessId: 'biz-1',
        createdAt: new Date(),
      };
      prisma.mockTx.orderItem.findMany.mockResolvedValue([orderItem]);

      // Product with trackStock=false
      prisma.mockTx.product.findMany.mockResolvedValue([
        { id: 'prod-2', name: 'Coca Cola', trackStock: false, currentStock: decimal(0) },
      ]);

      await service.payOrder({
        businessId: 'biz-1',
        userId: 'user-1',
        orderId: 'order-1',
        dto,
      });

      // No debe crear movimiento de inventario ni actualizar stock
      expect(prisma.mockTx.inventoryMovement!.create).not.toHaveBeenCalled();
      expect(prisma.mockTx.product!.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when stock is insufficient for a product', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      prisma.mockPrisma.payment.create.mockResolvedValue({
        id: 'payment-1', businessId: 'biz-1', orderId: 'order-1',
        method: 'CASH', amount: decimal(100), tendered: decimal(150), change: decimal(50),
        reference: null, cashierId: 'user-1', createdAt: new Date(),
      });
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder, status: 'PAID' as OrderStatus,
      });
      prisma.mockPrisma.orderStateLog.create.mockResolvedValue({} as any);

      // Item with quantity 10, but stock is only 3
      const orderItem = {
        id: 'item-1', orderId: 'order-1',
        productId: 'prod-1', quantity: 10, unitPrice: decimal(10),
        lineTotal: decimal(100),
        productName: 'Hamburguesa', taxRate: decimal(13),
        preparationAreaId: null, preparationAreaName: null, notes: null,
        businessId: 'biz-1', createdAt: new Date(),
      };
      prisma.mockTx.orderItem.findMany.mockResolvedValue([orderItem]);

      // Insufficient stock (3 < 10)
      prisma.mockTx.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'Hamburguesa', trackStock: true, currentStock: decimal(3) },
      ]);

      await expect(
        service.payOrder({
          businessId: 'biz-1',
          userId: 'user-1',
          orderId: 'order-1',
          dto,
        }),
      ).rejects.toThrow(BadRequestException);

      // No debe crear movimientos ni actualizar stock
      expect(prisma.mockTx.inventoryMovement!.create).not.toHaveBeenCalled();
      expect(prisma.mockTx.product!.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException with descriptive message listing insufficient items', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      prisma.mockPrisma.payment.create.mockResolvedValue({
        id: 'payment-1', businessId: 'biz-1', orderId: 'order-1',
        method: 'CASH', amount: decimal(100), tendered: decimal(150), change: decimal(50),
        reference: null, cashierId: 'user-1', createdAt: new Date(),
      });
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder, status: 'PAID' as OrderStatus,
      });
      prisma.mockPrisma.orderStateLog.create.mockResolvedValue({} as any);

      const items = [
        {
          id: 'item-1', orderId: 'order-1',
          productId: 'prod-1', quantity: 5, unitPrice: decimal(10),
          lineTotal: decimal(50),
          productName: 'Hamburguesa', taxRate: decimal(13),
          preparationAreaId: null, preparationAreaName: null, notes: null,
          businessId: 'biz-1', createdAt: new Date(),
        },
        {
          id: 'item-2', orderId: 'order-1',
          productId: 'prod-2', quantity: 3, unitPrice: decimal(16.67),
          lineTotal: decimal(50),
          productName: 'Papas Fritas', taxRate: decimal(13),
          preparationAreaId: null, preparationAreaName: null, notes: null,
          businessId: 'biz-1', createdAt: new Date(),
        },
      ];
      prisma.mockTx.orderItem.findMany.mockResolvedValue(items);

      // Both products have insufficient stock
      prisma.mockTx.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'Hamburguesa', trackStock: true, currentStock: decimal(2) },
        { id: 'prod-2', name: 'Papas Fritas', trackStock: true, currentStock: decimal(1) },
      ]);

      try {
        await service.payOrder({
          businessId: 'biz-1',
          userId: 'user-1',
          orderId: 'order-1',
          dto,
        });
        fail('Should have thrown');
      } catch (e) {
        const err = e as BadRequestException;
        expect(err.message).toContain('Hamburguesa');
        expect(err.message).toContain('Papas Fritas');
        expect(err.message).toContain('stock 2');
        expect(err.message).toContain('necesita 5');
      }
    });

    it('processes payment when all trackable items have sufficient stock', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      prisma.mockPrisma.payment.create.mockResolvedValue({
        id: 'payment-1', businessId: 'biz-1', orderId: 'order-1',
        method: 'CASH', amount: decimal(100), tendered: decimal(150), change: decimal(50),
        reference: null, cashierId: 'user-1', createdAt: new Date(),
      });
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder, status: 'PAID' as OrderStatus,
      });
      prisma.mockPrisma.orderStateLog.create.mockResolvedValue({} as any);

      const orderItem = {
        id: 'item-1', orderId: 'order-1',
        productId: 'prod-1', quantity: 3, unitPrice: decimal(33.33),
        lineTotal: decimal(100),
        productName: 'Hamburguesa', taxRate: decimal(13),
        preparationAreaId: null, preparationAreaName: null, notes: null,
        businessId: 'biz-1', createdAt: new Date(),
      };
      prisma.mockTx.orderItem.findMany.mockResolvedValue([orderItem]);

      // Sufficient stock (10 >= 3)
      prisma.mockTx.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'Hamburguesa', trackStock: true, currentStock: decimal(10) },
      ]);
      prisma.mockTx.inventoryMovement.create.mockResolvedValue({} as any);
      prisma.mockTx.product.update.mockResolvedValue({} as any);

      const result = await service.payOrder({
        businessId: 'biz-1',
        userId: 'user-1',
        orderId: 'order-1',
        dto,
      });

      expect(result.order.status).toBe('PAID');
      // Stock deduction should have happened
      expect(prisma.mockTx.inventoryMovement!.create).toHaveBeenCalledTimes(1);
    });

    it('deducts stock only for trackable items in mixed orders', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue(baseOrder);
      prisma.mockPrisma.payment.create.mockResolvedValue({
        id: 'payment-1', businessId: 'biz-1', orderId: 'order-1',
        method: 'CASH', amount: decimal(100), tendered: decimal(150), change: decimal(50),
        reference: null, cashierId: 'user-1', createdAt: new Date(),
      });
      prisma.mockPrisma.order.update.mockResolvedValue({
        ...baseOrder, status: 'PAID' as OrderStatus,
      });
      prisma.mockPrisma.orderStateLog.create.mockResolvedValue({} as any);

      // Item 1: trackea stock → debe descontar
      const trackableItem = {
        id: 'item-1', orderId: 'order-1',
        productId: 'prod-1', quantity: 2, unitPrice: decimal(30),
        lineTotal: decimal(60),
        productName: 'Hamburguesa', taxRate: decimal(13),
        preparationAreaId: null, preparationAreaName: null, notes: null,
        businessId: 'biz-1', createdAt: new Date(),
      };
      // Item 2: NO trackea stock → no debe descontar
      const nonTrackableItem = {
        id: 'item-2', orderId: 'order-1',
        productId: 'prod-2', quantity: 1, unitPrice: decimal(40),
        lineTotal: decimal(40),
        productName: 'Servicio', taxRate: decimal(0),
        preparationAreaId: null, preparationAreaName: null, notes: null,
        businessId: 'biz-1', createdAt: new Date(),
      };
      prisma.mockTx.orderItem.findMany.mockResolvedValue([trackableItem, nonTrackableItem]);

      // Products: one trackable, one not
      prisma.mockTx.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'Hamburguesa', trackStock: true, currentStock: decimal(50) },
        { id: 'prod-2', name: 'Servicio', trackStock: false, currentStock: decimal(0) },
      ]);
      prisma.mockTx.inventoryMovement.create.mockResolvedValue({} as any);
      prisma.mockTx.product.update.mockResolvedValue({} as any);

      await service.payOrder({
        businessId: 'biz-1',
        userId: 'user-1',
        orderId: 'order-1',
        dto,
      });

      // Solo debe crear 1 movimiento (solo 1 item trackeable)
      expect(prisma.mockTx.inventoryMovement.create).toHaveBeenCalledTimes(1);
      expect(prisma.mockTx.product.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('listForOrder', () => {
    it('returns payments for given order', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue({ id: 'order-1' });
      prisma.mockPrisma.payment.findMany.mockResolvedValue([{
        id: 'payment-1', method: 'CASH', amount: decimal(100),
        tendered: decimal(150), change: decimal(50),
        reference: null, cashierId: 'user-1', createdAt: new Date(),
      }]);

      const result = await service.listForOrder({ businessId: 'biz-1', orderId: 'order-1' });

      expect(result).toHaveLength(1);
      expect(result[0]!.method).toBe('CASH');
    });

    it('filters by businessId and orderId', async () => {
      prisma.mockPrisma.order.findFirst.mockResolvedValue({ id: 'order-1' });
      prisma.mockPrisma.payment.findMany.mockResolvedValue([]);

      await service.listForOrder({ businessId: 'biz-1', orderId: 'order-1' });

      expect(prisma.mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { businessId: 'biz-1', orderId: 'order-1' },
        }),
      );
    });
  });

  describe('previewChange', () => {
    it('returns change for CASH payment that covers the amount', async () => {
      const result = await service.previewChange('100', '150');
      expect(result).toEqual({ change: '50', sufficient: true, tendered: '150' });
    });

    it('returns zero change for exact payment', async () => {
      const result = await service.previewChange('100', '100');
      expect(result).toEqual({ change: '0', sufficient: true, tendered: '100' });
    });

    it('returns zero change when tendered is less than amount (should be validated upstream)', async () => {
      const result = await service.previewChange('100', '80');
      expect(result).toEqual({ change: '0.00', sufficient: false, tendered: '80' });
    });
  });
});
