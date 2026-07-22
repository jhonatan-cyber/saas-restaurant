import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { buildControllerTest, createTestUser } from '../test/controller-test.helper';

const mockUser = createTestUser({ role: 'OWNER' as const, branchIds: [], defaultBranchId: null });

describe('SubscriptionController', () => {
  const serviceMock = {
    getCurrent: jest.fn(),
    assign: jest.fn(),
    cancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCurrent', () => {
    it('delegates to SubscriptionService with user.businessId', async () => {
      const mockSub = { id: 'sub-1', status: 'TRIALING', plan: { name: 'Free' } };
      serviceMock.getCurrent.mockResolvedValue(mockSub);

      const controller = await buildControllerTest(SubscriptionController, [
              { provide: SubscriptionService, useValue: serviceMock },
            ], { skipRolesGuard: true });
      const result = await controller.getCurrent(mockUser);

      expect(serviceMock.getCurrent).toHaveBeenCalledWith('biz-1');
      expect(result).toEqual(mockSub);
    });
  });

  describe('assign', () => {
    it('delegates to SubscriptionService with businessId and planId', async () => {
      serviceMock.assign.mockResolvedValue({ id: 'sub-1', status: 'ACTIVE' });

      const controller = await buildControllerTest(SubscriptionController, [
              { provide: SubscriptionService, useValue: serviceMock },
            ]);
      const dto = { planId: 'plan-pro' };
      const result = await controller.assign(mockUser, dto);

      expect(serviceMock.assign).toHaveBeenCalledWith('biz-1', 'plan-pro');
      expect(result).toEqual({ id: 'sub-1', status: 'ACTIVE' });
    });

    it('passes through errors', async () => {
      const error = new Error('Plan no encontrado');
      serviceMock.assign.mockRejectedValue(error);

      const controller = await buildControllerTest(SubscriptionController, [
              { provide: SubscriptionService, useValue: serviceMock },
            ]);
      await expect(controller.assign(mockUser, { planId: 'x' })).rejects.toThrow(error);
    });
  });

  describe('cancel', () => {
    it('delegates to SubscriptionService with businessId', async () => {
      serviceMock.cancel.mockResolvedValue({ id: 'sub-1', status: 'CANCELLED' });

      const controller = await buildControllerTest(SubscriptionController, [
              { provide: SubscriptionService, useValue: serviceMock },
            ]);
      const result = await controller.cancel(mockUser);

      expect(serviceMock.cancel).toHaveBeenCalledWith('biz-1');
      expect(result).toEqual({ id: 'sub-1', status: 'CANCELLED' });
    });

    it('passes through errors', async () => {
      const error = new Error('No hay suscripción activa');
      serviceMock.cancel.mockRejectedValue(error);

      const controller = await buildControllerTest(SubscriptionController, [
              { provide: SubscriptionService, useValue: serviceMock },
            ]);
      await expect(controller.cancel(mockUser)).rejects.toThrow(error);
    });
  });
});
