import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CsrfGuard } from './csrf.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let reflector: Reflector;
  let getAllAndOverrideSpy: jest.SpyInstance;
  let mockRequest: {
    method: string;
    cookies?: Record<string, string>;
    headers: Record<string, string | string[] | undefined>;
  };

  function createContext(): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = new Reflector();
    guard = new CsrfGuard(reflector);
    getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    mockRequest = {
      method: 'POST',
      cookies: { csrf_token: 'valid-token' },
      headers: { 'x-csrf-token': 'valid-token' },
    };
  });

  afterEach(() => {
    getAllAndOverrideSpy.mockRestore();
  });

  describe('canActivate', () => {
    // ── Safe HTTP methods ──────────────────────────────────────────────

    it('returns true for GET requests (safe method)', () => {
      mockRequest.method = 'GET';
      expect(guard.canActivate(createContext())).toBe(true);
    });

    it('returns true for HEAD requests (safe method)', () => {
      mockRequest.method = 'HEAD';
      expect(guard.canActivate(createContext())).toBe(true);
    });

    it('returns true for OPTIONS requests (safe method)', () => {
      mockRequest.method = 'OPTIONS';
      expect(guard.canActivate(createContext())).toBe(true);
    });

    // ── @Public() routes ───────────────────────────────────────────────

    it('returns true for POST routes marked with @Public()', () => {
      getAllAndOverrideSpy.mockReturnValue(true);
      expect(guard.canActivate(createContext())).toBe(true);
    });

    it('returns true for PUT routes marked with @Public()', () => {
      mockRequest.method = 'PUT';
      getAllAndOverrideSpy.mockReturnValue(true);
      expect(guard.canActivate(createContext())).toBe(true);
    });

    it('returns true for DELETE routes marked with @Public()', () => {
      mockRequest.method = 'DELETE';
      getAllAndOverrideSpy.mockReturnValue(true);
      expect(guard.canActivate(createContext())).toBe(true);
    });

    // ── Token validation ───────────────────────────────────────────────

    it('returns true when csrf_token cookie matches X-CSRF-Token header', () => {
      expect(guard.canActivate(createContext())).toBe(true);
    });

    it('throws ForbiddenException when tokens do not match', () => {
      mockRequest.headers['x-csrf-token'] = 'different-token';

      expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when csrf_token cookie is missing', () => {
      mockRequest.cookies = {};

      expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when X-CSRF-Token header is missing', () => {
      delete mockRequest.headers['x-csrf-token'];

      expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
    });

    it('handles undefined cookies gracefully', () => {
      mockRequest.cookies = undefined as any;

      expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException with descriptive message', () => {
      mockRequest.cookies = {};

      try {
        guard.canActivate(createContext());
        fail('Should have thrown');
      } catch (e) {
        const err = e as ForbiddenException;
        expect(err.message).toMatch(/CSRF token/i);
      }
    });

    // ── Other methods ──────────────────────────────────────────────────

    it('handles PATCH method (not safe, requires CSRF)', () => {
      mockRequest.method = 'PATCH';
      mockRequest.cookies = { csrf_token: 'token' };
      mockRequest.headers['x-csrf-token'] = 'token';

      expect(guard.canActivate(createContext())).toBe(true);
    });
  });
});
