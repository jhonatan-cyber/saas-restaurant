import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock window.location
const mockLocation: { href: string } = { href: '' };
Object.defineProperty(globalThis, 'window', {
  value: { location: mockLocation },
  writable: true,
  configurable: true,
});

// Mock document.cookie
let mockCookie = '';
Object.defineProperty(globalThis, 'document', {
  value: {
    get cookie() { return mockCookie; },
    set cookie(val: string) { mockCookie = val; },
  },
  writable: true,
  configurable: true,
});

import { apiRequest, getCurrentUser, setCurrentUser, initCsrf } from '../client';

describe('getCurrentUser / setCurrentUser', () => {
  beforeEach(() => {
    setCurrentUser(null);
  });

  it('returns null initially', () => {
    expect(getCurrentUser()).toBeNull();
  });

  it('stores and retrieves user', () => {
    const user = { id: 'u1', email: 'admin@test.com', role: 'SUPER_ADMIN' };
    setCurrentUser(user);
    expect(getCurrentUser()).toEqual(user);
  });

  it('clears user when set to null', () => {
    setCurrentUser({ id: 'u1', email: 'admin@test.com', role: 'SUPER_ADMIN' });
    setCurrentUser(null);
    expect(getCurrentUser()).toBeNull();
  });
});

describe('apiRequest', () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    globalThis.fetch = mockFetch;
    mockCookie = '';
    setCurrentUser(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('makes GET request with JSON content type', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ data: 'test' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const result = await apiRequest<{ data: string }>('/test');

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(callArgs[0]).toBe('/api/test');
    expect(callArgs[1]?.headers).toEqual(expect.objectContaining({ 'Content-Type': 'application/json' }));
    expect(callArgs[1]?.credentials).toBe('include');
    expect(result).toEqual({ data: 'test' });
  });

  it('sends CSRF token on POST requests', async () => {
    mockCookie = 'csrf_token=my-csrf-value';
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await apiRequest('/test', { method: 'POST', body: '{}' });

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1]?.headers as Record<string, string> | undefined;
    expect(headers?.['X-CSRF-Token']).toBe('my-csrf-value');
  });

  it('sends CSRF token on PATCH requests', async () => {
    mockCookie = 'csrf_token=patch-token';
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await apiRequest('/test', { method: 'PATCH', body: '{}' });

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1]?.headers as Record<string, string> | undefined;
    expect(headers?.['X-CSRF-Token']).toBe('patch-token');
  });

  it('does NOT send CSRF token on GET requests', async () => {
    mockCookie = 'csrf_token=my-csrf-value';
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await apiRequest('/test');

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1]?.headers as Record<string, string> | undefined;
    expect(headers?.['X-CSRF-Token']).toBeUndefined();
  });

  it('does NOT send CSRF token when skipAuth is true', async () => {
    mockCookie = 'csrf_token=my-csrf-value';
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await apiRequest('/test', { method: 'POST', skipAuth: true, body: '{}' });

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = callArgs[1]?.headers as Record<string, string> | undefined;
    expect(headers?.['X-CSRF-Token']).toBeUndefined();
  });

  it('handles 204 No Content response', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await apiRequest<void>('/delete', { method: 'DELETE' });

    expect(result).toBeUndefined();
  });

  it('throws error with response message on non-ok status', async () => {
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(apiRequest('/not-found')).rejects.toThrow('Not found');
  });

  it('throws with status code when no message body', async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(apiRequest('/error')).rejects.toThrow('Error 500');
  });

  describe('auto-refresh on 401', () => {
    it('attempts token refresh and retries original request on 401', async () => {
      const dataResponse = new Response(JSON.stringify({ data: 'retried' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      mockFetch
        .mockResolvedValueOnce(new Response(null, { status: 401 }))   // original → 401
        .mockResolvedValueOnce(new Response(null, { status: 200 }))    // refresh → ok
        .mockResolvedValueOnce(dataResponse);                          // retry → ok

      const result = await apiRequest<{ data: string }>('/protected');

      const refreshCall = mockFetch.mock.calls[1] as [string, RequestInit];
      expect(refreshCall[0]).toBe('/api/auth/refresh');

      const retryCall = mockFetch.mock.calls[2] as [string, RequestInit];
      expect(retryCall[0]).toBe('/api/protected');

      expect(result).toEqual({ data: 'retried' });
    });

    it('clears session and redirects if refresh fails', async () => {
      mockFetch
        .mockResolvedValueOnce(new Response(null, { status: 401 }))  // original → 401
        .mockResolvedValueOnce(new Response(null, { status: 401 })); // refresh → 401

      await expect(apiRequest('/protected')).rejects.toThrow('Sesión expirada');
      expect(mockLocation.href).toBe('/admin/login');
    });

    it('does not attempt refresh on auth endpoints', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));

      await expect(apiRequest('/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: '{}',
      })).rejects.toThrow('Error 401');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});

describe('initCsrf', () => {
  it('fetches CSRF token from /auth/csrf-token', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ csrfToken: 'abc' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    globalThis.fetch = fetchMock;

    await initCsrf();

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/csrf-token',
      expect.objectContaining({
        credentials: 'include',
      }),
    );
  });

  it('does not throw on error', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network error'));
    globalThis.fetch = fetchMock;

    await expect(initCsrf()).resolves.toBeUndefined();
  });
});
