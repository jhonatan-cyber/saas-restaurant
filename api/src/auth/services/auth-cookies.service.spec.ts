import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthCookiesService } from './auth-cookies.service';

function mockRes(): Response {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;
}

function createService(prefix = 'api'): AuthCookiesService {
  const config = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'API_GLOBAL_PREFIX') return prefix;
      return defaultValue ?? null;
    }),
  } as unknown as ConfigService;
  return new AuthCookiesService(config);
}

describe('AuthCookiesService', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('refreshCookiePath', () => {
    it('returns default path when prefix is "api"', () => {
      const service = createService('api');
      expect(service.refreshCookiePath).toBe('/api/auth/refresh');
    });

    it('uses custom API_GLOBAL_PREFIX', () => {
      const service = createService('v2');
      expect(service.refreshCookiePath).toBe('/v2/auth/refresh');
    });

    it('handles empty prefix gracefully', () => {
      const service = createService('');
      expect(service.refreshCookiePath).toBe('/auth/refresh');
    });
  });

  describe('setAccessCookie', () => {
    it('sets access_token with correct name and value', () => {
      const service = createService();
      const res = mockRes();

      service.setAccessCookie(res, 'my-access-jwt');

      expect(res.cookie).toHaveBeenCalledWith(
        'access_token',
        'my-access-jwt',
        expect.any(Object),
      );
    });

    it('sets httpOnly, sameSite=lax, path=/, and 15min maxAge', () => {
      const service = createService();
      const res = mockRes();

      service.setAccessCookie(res, 'token');

      const options = (res.cookie as jest.Mock).mock.calls[0]![2] as Record<string, unknown>;
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
      expect(options.maxAge).toBe(15 * 60 * 1000); // 15 min
    });

    it('sets secure=true in production', () => {
      process.env.NODE_ENV = 'production';
      const service = createService();
      const res = mockRes();

      service.setAccessCookie(res, 'token');

      const options = (res.cookie as jest.Mock).mock.calls[0]![2] as Record<string, unknown>;
      expect(options.secure).toBe(true);
    });

    it('sets secure=false in development', () => {
      process.env.NODE_ENV = 'development';
      const service = createService();
      const res = mockRes();

      service.setAccessCookie(res, 'token');

      const options = (res.cookie as jest.Mock).mock.calls[0]![2] as Record<string, unknown>;
      expect(options.secure).toBe(false);
    });
  });

  describe('setRefreshCookie', () => {
    it('sets refresh_token with correct name and value', () => {
      const service = createService();
      const res = mockRes();

      service.setRefreshCookie(res, 'my-refresh-jwt');

      expect(res.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'my-refresh-jwt',
        expect.any(Object),
      );
    });

    it('sets path to dynamic refresh endpoint', () => {
      const service = createService('api');
      const res = mockRes() as unknown as Response;

      service.setRefreshCookie(res, 'token');

      const options = (res.cookie as jest.Mock).mock.calls[0]![2] as Record<string, unknown>;
      expect(options.path).toBe('/api/auth/refresh');
    });

    it('reflects custom prefix in path', () => {
      const service = createService('v2');
      const res = mockRes() as unknown as Response;

      service.setRefreshCookie(res, 'token');

      const options = (res.cookie as jest.Mock).mock.calls[0]![2] as Record<string, unknown>;
      expect(options.path).toBe('/v2/auth/refresh');
    });

    it('sets httpOnly, sameSite=strict, and 7d maxAge', () => {
      const service = createService();
      const res = mockRes() as unknown as Response;

      service.setRefreshCookie(res, 'token');

      const options = (res.cookie as jest.Mock).mock.calls[0]![2] as Record<string, unknown>;
      expect(options.httpOnly).toBe(true);
      expect(options.sameSite).toBe('strict');
      expect(options.maxAge).toBe(7 * 24 * 60 * 60 * 1000); // 7 días
    });
  });

  describe('setCsrfCookie', () => {
    it('sets csrf_token with correct name and value', () => {
      const service = createService();
      const res = mockRes();

      service.setCsrfCookie(res, 'csrf-value');

      expect(res.cookie).toHaveBeenCalledWith(
        'csrf_token',
        'csrf-value',
        expect.any(Object),
      );
    });

    it('is NOT httpOnly (JS must read it), path=/, sameSite=lax', () => {
      const service = createService();
      const res = mockRes();

      service.setCsrfCookie(res, 'token');

      const options = (res.cookie as jest.Mock).mock.calls[0]![2] as Record<string, unknown>;
      expect(options.httpOnly).toBe(false);
      expect(options.sameSite).toBe('lax');
      expect(options.path).toBe('/');
    });
  });

  describe('setAuthCookies', () => {
    it('calls setAccessCookie and setRefreshCookie', () => {
      const service = createService();
      const res = mockRes();
      const setAccessSpy = jest.spyOn(service, 'setAccessCookie');
      const setRefreshSpy = jest.spyOn(service, 'setRefreshCookie');

      service.setAuthCookies(res, 'access-jwt', 'refresh-jwt');

      expect(setAccessSpy).toHaveBeenCalledWith(res, 'access-jwt');
      expect(setRefreshSpy).toHaveBeenCalledWith(res, 'refresh-jwt');
    });
  });

  describe('clearAuthCookies', () => {
    it('clears access_token, refresh_token, and csrf_token', () => {
      const service = createService('api');
      const res = mockRes() as unknown as Response;

      service.clearAuthCookies(res);

      expect(res.clearCookie).toHaveBeenCalledWith('access_token', { path: '/' });
      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/api/auth/refresh' });
      expect(res.clearCookie).toHaveBeenCalledWith('csrf_token', { path: '/' });
    });

    it('uses dynamic path for refresh_token clear', () => {
      const service = createService('v2');
      const res = mockRes() as unknown as Response;

      service.clearAuthCookies(res);

      expect(res.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/v2/auth/refresh' });
    });

    it('calls clearCookie exactly 3 times', () => {
      const service = createService();
      const res = mockRes() as unknown as Response;

      service.clearAuthCookies(res);

      expect(res.clearCookie).toHaveBeenCalledTimes(3);
    });
  });
});
