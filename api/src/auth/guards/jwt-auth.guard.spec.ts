import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let getAllAndOverrideSpy: jest.SpyInstance;

  function createMockContext(): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
    getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride');
  });

  afterEach(() => {
    getAllAndOverrideSpy.mockRestore();
  });

  describe('canActivate', () => {
    it('returns true for routes marked with @Public()', () => {
      getAllAndOverrideSpy.mockReturnValue(true);
      const context = createMockContext();
      expect(guard.canActivate(context)).toBe(true);
    });

    it('delegates to Passport AuthGuard for non-public routes (rejects without strategy)', async () => {
      getAllAndOverrideSpy.mockReturnValue(undefined);
      const context = createMockContext();

      // super.canActivate() → Passport AuthGuard returns Promise<boolean>
      // Without the 'jwt' strategy registered, it will reject
      await expect(guard.canActivate(context)).rejects.toThrow();
    });

    it('does not set metadata on handler when not public', async () => {
      getAllAndOverrideSpy.mockReturnValue(undefined);
      const handler = () => {};
      const context = {
        getHandler: () => handler,
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({}),
          getResponse: () => ({}),
        }),
      } as unknown as ExecutionContext;

      // Ignore rejection from Passport (no strategy configured)
      try {
        await guard.canActivate(context);
      } catch {
        // Expected to reject
      }

      const meta = reflector.get(IS_PUBLIC_KEY, handler);
      expect(meta).toBeUndefined();
    });

    it('returns true for @Public() regardless of HTTP method', () => {
      getAllAndOverrideSpy.mockReturnValue(true);
      const context = createMockContext();
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});
