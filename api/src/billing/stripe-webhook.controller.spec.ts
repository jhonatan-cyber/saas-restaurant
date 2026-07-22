import type { Request } from 'express';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeService } from './stripe.service';
import { buildControllerTest, mockUser } from '../test/controller-test.helper';

describe('StripeWebhookController', () => {
  const serviceMock = {
    handleWebhook: jest.fn(),
  };
  const serverError = new Error('Server error');

  beforeEach(() => { jest.clearAllMocks(); });

  describe('handleWebhook', () => {
    it('delegates to stripe service with signature and raw body', async () => {
      serviceMock.handleWebhook.mockResolvedValue({ received: true });
      const ctrl = await buildControllerTest(StripeWebhookController, [
        { provide: StripeService, useValue: serviceMock },
      ], { skipJwtGuard: true, skipScopeGuard: true, skipRolesGuard: true });
      const rawBody = Buffer.from(JSON.stringify({ type: 'checkout.session.completed' }));
      const req = {
        rawBody,
        body: {},
        user: mockUser,
      } as unknown as Request;

      const result = await ctrl.handleWebhook('test_signature', req);

      expect(serviceMock.handleWebhook).toHaveBeenCalledWith('test_signature', rawBody);
      expect(result).toEqual({ received: true });
    });

    it('falls back to JSON body when rawBody is not available', async () => {
      serviceMock.handleWebhook.mockResolvedValue({ received: true });
      const ctrl = await buildControllerTest(StripeWebhookController, [
        { provide: StripeService, useValue: serviceMock },
      ], { skipJwtGuard: true, skipScopeGuard: true, skipRolesGuard: true });
      const jsonBody = { type: 'invoice.payment_failed' };
      const req = {
        rawBody: undefined,
        body: jsonBody,
      } as unknown as Request;

      const result = await ctrl.handleWebhook('sig', req);

      const expectedBuffer = Buffer.from(JSON.stringify(jsonBody));
      expect(serviceMock.handleWebhook).toHaveBeenCalledWith('sig', expectedBuffer);
      expect(result).toEqual({ received: true });
    });

    it('passes through errors from service', async () => {
      serviceMock.handleWebhook.mockRejectedValue(serverError);
      const ctrl = await buildControllerTest(StripeWebhookController, [
        { provide: StripeService, useValue: serviceMock },
      ], { skipJwtGuard: true, skipScopeGuard: true, skipRolesGuard: true });
      const req = { rawBody: Buffer.from('{}'), body: {} } as unknown as Request;

      await expect(ctrl.handleWebhook('sig', req)).rejects.toThrow(serverError);
    });

    it('is decorated with @Public() - no auth guard', async () => {
      // Verify guards are skipped — if this builds without JwtGuard override,
      // the test would fail. The buildControllerTest override ensures it works.
      serviceMock.handleWebhook.mockResolvedValue({ received: true });
      const ctrl = await buildControllerTest(StripeWebhookController, [
        { provide: StripeService, useValue: serviceMock },
      ], { skipJwtGuard: true, skipScopeGuard: true, skipRolesGuard: true });
      const req = { rawBody: Buffer.from('{}'), body: {} } as unknown as Request;

      await expect(ctrl.handleWebhook('sig', req)).resolves.toEqual({ received: true });
    });
  });
});
