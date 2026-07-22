import { BillingController } from './billing.controller';
import { StripeService } from './stripe.service';
import { mockUser, mockCtx, buildControllerTest } from '../test/controller-test.helper';

describe('BillingController', () => {
  const serviceMock = {
    createCheckoutSession: jest.fn(),
    createPortalSession: jest.fn(),
  };
  const serverError = new Error('Server error');

  beforeEach(() => { jest.clearAllMocks(); });

  describe('createCheckout', () => {
    it('delegates to stripe service with dto', async () => {
      serviceMock.createCheckoutSession.mockResolvedValue({
        url: 'https://checkout.stripe.com/session_123',
        sessionId: 'session_123',
      });
      const ctrl = await buildControllerTest(BillingController, [
        { provide: StripeService, useValue: serviceMock },
      ]);
      const dto = {
        planId: 'plan-1',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
      };
      const result = await ctrl.createCheckout(mockUser, dto);

      expect(serviceMock.createCheckoutSession).toHaveBeenCalledWith({
        businessId: 'biz-1',
        planId: 'plan-1',
        userId: 'user-1',
        successUrl: 'https://app.example.com/success',
        cancelUrl: 'https://app.example.com/cancel',
      });
      expect(result.url).toBe('https://checkout.stripe.com/session_123');
    });

    it('passes through errors from service', async () => {
      serviceMock.createCheckoutSession.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(BillingController, [
        { provide: StripeService, useValue: serviceMock },
      ]);
      const dto = { planId: 'plan-1' };
      await expect(ctrl.createCheckout(mockUser, dto)).rejects.toThrow(serverError);
    });
  });

  describe('createPortal', () => {
    it('delegates to stripe service with returnUrl', async () => {
      serviceMock.createPortalSession.mockResolvedValue({
        url: 'https://portal.stripe.com/portal_123',
      });
      const ctrl = await buildControllerTest(BillingController, [
        { provide: StripeService, useValue: serviceMock },
      ]);
      const result = await ctrl.createPortal(mockUser, 'https://app.example.com/return');

      expect(serviceMock.createPortalSession).toHaveBeenCalledWith(
        mockUser.businessId,
        'https://app.example.com/return',
      );
      expect(result.url).toBe('https://portal.stripe.com/portal_123');
    });

    it('works without returnUrl', async () => {
      serviceMock.createPortalSession.mockResolvedValue({
        url: 'https://portal.stripe.com/portal_123',
      });
      const ctrl = await buildControllerTest(BillingController, [
        { provide: StripeService, useValue: serviceMock },
      ]);
      await ctrl.createPortal(mockUser, undefined);

      expect(serviceMock.createPortalSession).toHaveBeenCalledWith(
        mockUser.businessId,
        undefined,
      );
    });

    it('passes through errors from service', async () => {
      serviceMock.createPortalSession.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(BillingController, [
        { provide: StripeService, useValue: serviceMock },
      ]);
      await expect(ctrl.createPortal(mockUser, undefined)).rejects.toThrow(serverError);
    });
  });
});
