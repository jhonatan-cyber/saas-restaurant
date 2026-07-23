import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authApi } from '../auth';
import { apiRequest, setCurrentUser, initCsrf } from '../client';

// Mock the client module
vi.mock('../client', () => ({
  apiRequest: vi.fn(),
  setCurrentUser: vi.fn(),
  getCurrentUser: vi.fn(),
  initCsrf: vi.fn(),
}));

const mockUser = { id: 'u1', email: 'admin@test.com', role: 'SUPER_ADMIN' };

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('calls apiRequest with correct endpoint and credentials', async () => {
      const response = {
        accessToken: 'at-123',
        refreshToken: 'rt-456',
        user: mockUser,
      };
      vi.mocked(apiRequest).mockResolvedValueOnce(response);

      const result = await authApi.login({ email: 'admin@test.com', password: 'secret123' });

      expect(apiRequest).toHaveBeenCalledWith(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email: 'admin@test.com', password: 'secret123' }), skipAuth: true },
      );
      expect(result).toEqual(response);
    });
  });

  describe('me', () => {
    it('returns current authenticated user', async () => {
      vi.mocked(apiRequest).mockResolvedValueOnce(mockUser);

      const result = await authApi.me();

      expect(apiRequest).toHaveBeenCalledWith('/admin/auth/me');
      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('calls logout endpoint POST with skipAuth', async () => {
      vi.mocked(apiRequest).mockResolvedValueOnce({ message: 'Sesión cerrada' });

      const result = await authApi.logout();

      expect(apiRequest).toHaveBeenCalledWith(
        '/auth/logout',
        { method: 'POST', skipAuth: true },
      );
      expect(result).toEqual({ message: 'Sesión cerrada' });
    });
  });

  describe('doLogin', () => {
    it('logs in, sets current user, and initializes CSRF', async () => {
      vi.mocked(apiRequest).mockResolvedValueOnce({
        accessToken: 'at-123',
        refreshToken: 'rt-456',
        user: mockUser,
      });
      vi.mocked(initCsrf).mockResolvedValueOnce(undefined);

      const result = await authApi.doLogin('admin@test.com', 'secret123');

      expect(apiRequest).toHaveBeenCalledWith(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email: 'admin@test.com', password: 'secret123' }), skipAuth: true },
      );
      expect(setCurrentUser).toHaveBeenCalledWith(mockUser);
      expect(initCsrf).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockUser);
    });

    it('does not throw if CSRF initialization fails', async () => {
      vi.mocked(apiRequest).mockResolvedValueOnce({
        accessToken: 'at-123',
        refreshToken: 'rt-456',
        user: mockUser,
      });
      vi.mocked(initCsrf).mockRejectedValueOnce(new Error('CSRF error'));

      const result = await authApi.doLogin('admin@test.com', 'secret123');

      expect(result).toEqual(mockUser);
      expect(setCurrentUser).toHaveBeenCalledWith(mockUser);
    });

    it('throws if login fails', async () => {
      vi.mocked(apiRequest).mockRejectedValueOnce(new Error('Credenciales inválidas'));

      await expect(authApi.doLogin('bad@test.com', 'wrong')).rejects.toThrow('Credenciales inválidas');
      expect(setCurrentUser).not.toHaveBeenCalled();
    });
  });

  describe('doLogout', () => {
    it('calls logout and clears current user', async () => {
      vi.mocked(apiRequest).mockResolvedValueOnce({ message: 'Sesión cerrada' });

      await authApi.doLogout();

      expect(apiRequest).toHaveBeenCalledWith(
        '/auth/logout',
        { method: 'POST', skipAuth: true },
      );
      expect(setCurrentUser).toHaveBeenCalledWith(null);
    });

    it('clears current user even if logout API call fails', async () => {
      vi.mocked(apiRequest).mockRejectedValueOnce(new Error('Network error'));

      await authApi.doLogout();

      expect(setCurrentUser).toHaveBeenCalledWith(null);
    });
  });
});
