/**
 * Cliente HTTP base con CSRF + auto-refresh.
 */
import type { AuthUser } from './types';

const API_BASE = typeof document !== 'undefined'
  ? '/api'
  : process.env.API_INTERNAL_URL || 'http://localhost:3001/api';

// ── CSRF Token helper ────────────────────────────────────────────────────────

function getCsrfToken(): string | null {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    if (match) return match[1] ?? null;
  }
  return null;
}

// ── Auth helpers (in-memory) ─────────────────────────────────────────────────

let currentUser: AuthUser | null = null;

export function getCurrentUser(): AuthUser | null {
  return currentUser;
}

export function setCurrentUser(user: AuthUser | null): void {
  currentUser = user;
}

// ── Request wrapper con CSRF + auto-refresh ─────────────────────────────────

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiRequest<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, ...fetchOptions } = options;
  const method = (fetchOptions.method ?? 'GET').toUpperCase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> | undefined),
  };

  // CSRF: agregar X-CSRF-Token en mutating requests (excepto auth endpoints)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && !skipAuth) {
    const csrf = getCsrfToken();
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }
  }

  const doFetch = (): Promise<Response> =>
    fetch(`${API_BASE}${url}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
    });

  let res = await doFetch();

  // Auto-refresh en 401 (solo si no es ya un intento de refresh o login)
  if (res.status === 401 && !skipAuth && !url.includes('/auth/')) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await doFetch();
    } else {
      // Refresh falló: limpiar sesión y redirigir
      currentUser = null;
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
      throw new Error('Sesión expirada');
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Error ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ── Inicialización CSRF ─────────────────────────────────────────────────────

export async function initCsrf(): Promise<void> {
  try {
    await apiRequest<{ csrfToken: string }>('/auth/csrf-token', { skipAuth: true });
  } catch {
    // Non-critical: el CSRF se refrescará en el primer 403
  }
}