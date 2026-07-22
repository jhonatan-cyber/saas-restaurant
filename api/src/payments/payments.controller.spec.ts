import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { createTestUser, mockReq, buildControllerTest } from '../test/controller-test.helper';

const mockUser = createTestUser({ role: 'CAJERO' as const, branchIds: [], defaultBranchId: null });

describe('PaymentsController', () => {
  const serviceMock = {
    payOrder: jest.fn(),
    listForOrder: jest.fn(),
    previewChange: jest.fn(),
  };

  beforeEach(() => { jest.clearAllMocks(); });

  describe('pay', () => {
    it('delegates to service with orderId and dto', async () => {
      const mockResult = { id: 'pay-1', status: 'COMPLETED' };
      serviceMock.payOrder.mockResolvedValue(mockResult);

      const ctrl = await buildControllerTest(PaymentsController, [
              { provide: PaymentsService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      const dto = { method: 'EFECTIVO', tendered: 500, items: [] } as any;

      const result = await ctrl.pay(req, 'order-1', dto);
      expect(serviceMock.payOrder).toHaveBeenCalledWith({
        businessId: 'biz-1', userId: 'user-1', orderId: 'order-1', dto,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('listForOrder', () => {
    it('delegates to service', async () => {
      serviceMock.listForOrder.mockResolvedValue([]);
      const ctrl = await buildControllerTest(PaymentsController, [
              { provide: PaymentsService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const req = mockReq(mockUser);
      await ctrl.listForOrder(req, 'order-1');
      expect(serviceMock.listForOrder).toHaveBeenCalledWith({ businessId: 'biz-1', orderId: 'order-1' });
    });
  });

  describe('previewChange', () => {
    it('delegates to service with total and tendered', async () => {
      serviceMock.previewChange.mockResolvedValue({ change: 100, breakdown: [] });
      const ctrl = await buildControllerTest(PaymentsController, [
              { provide: PaymentsService, useValue: serviceMock },
            ], { skipScopeGuard: true });
      const dto = { tendered: '500' } as any;
      const result = await ctrl.previewChange('400', dto);
      expect(serviceMock.previewChange).toHaveBeenCalledWith('400', '500');
      expect(result).toEqual({ change: 100, breakdown: [] });
    });
  });
});
