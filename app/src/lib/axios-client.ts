/**
 * Cliente Axios con interceptores globales para el Admin Panel.
 *
 * MEJORA DE SEGURIDAD (Phase 5): tokens JWT en cookies HttpOnly.
 *
 * - Request interceptor: ya NO adjunta Bearer token (va en cookie).
 *   Adjunta headers multi-tenant y CSRF token en mutating requests.
 * - Response interceptor: detecta 401, refresca automáticamente vía
 *   /auth/refresh (usando la refresh_token cookie), y reintenta.
 *
 * Sigue el mismo patrón que mobile/src/lib/api-client.ts
 * pero con cookies en lugar de Bearer tokens.
 */
import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { HEADERS } from '@saas/shared';
import { useAuthStore, authStoreHelpers } from './auth-store';
import { branchStoreHelpers } from './branch-store';

const isBrowser = typeof window !== 'undefined';

const API_BASE_URL = isBrowser
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3001/api')
  : (import.meta.env.VITE_API_URL || 'http://localhost:3001/api');

// ── CSRF Token helpers (Double Submit Cookie pattern) ────────────────

/**
 * Lee el token CSRF desde la cookie en cada llamada.
 * No hay caché en memoria: la cookie es la fuente de verdad.
 * El token se setea como cookie no-HttpOnly por el backend en GET /auth/csrf-token.
 * Se envía como header X-CSRF-Token en mutating requests.
 */
function getCsrfToken(): string | null {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    if (match) return match[1] ?? null;
  }
  return null;
}

// ── Error tipado ──────────────────────────────────────────────────────

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ── Axios instance ────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  // Enviar cookies (necesario para cookies HttpOnly con Vite proxy)
  withCredentials: true,
});

// ═════════════════════════════════════════════════════════════════════
//  REQUEST INTERCEPTOR
// ═════════════════════════════════════════════════════════════════════

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const custom = config as InternalAxiosRequestConfig & {
      _skipAuth?: boolean;
      _branchId?: string;
    };

    if (custom._skipAuth) return config;

    const state = useAuthStore.getState();
    if (state.user?.businessId) {
      config.headers[HEADERS.BUSINESS_ID] = state.user.businessId;
    }

    // Usar branchId explícito si se pasó, sino usar del store
    const branchId = custom._branchId ?? branchStoreHelpers.getActiveBranchId();
    if (branchId) {
      config.headers[HEADERS.BRANCH_ID] = branchId;
    }

    // CSRF: agregar X-CSRF-Token en mutating requests
    const method = (config.method ?? 'get').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      const csrf = getCsrfToken();
      if (csrf) {
        config.headers['X-CSRF-Token'] = csrf;
      }
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ═════════════════════════════════════════════════════════════════════
//  RESPONSE INTERCEPTOR (cookies manejan auth, con auto-refresh)
// ═════════════════════════════════════════════════════════════════════

// Cola de requests que esperan un refresh
let isRefreshingAuth = false;
let refreshAuthQueue: Array<{
  resolve: () => void;
  reject: (error: unknown) => void;
}> = [];

function processRefreshAuthQueue(error: unknown): void {
  for (const { resolve, reject } of refreshAuthQueue) {
    if (error) {
      reject(error);
    } else {
      resolve();
    }
  }
  refreshAuthQueue = [];
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean; _skipAuth?: boolean })
      | undefined;

    if (!originalRequest) {
      return Promise.reject(toApiClientError(error));
    }

    // ── 401: intentar refresh automático ───────────────────────────────
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest._skipAuth
    ) {
      if (isRefreshingAuth) {
        // Ya hay un refresh en curso, encolar esta request
        return new Promise<void>((resolve, reject) => {
          refreshAuthQueue.push({ resolve, reject });
        }).then(() => {
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshingAuth = true;

      try {
        // POST /auth/refresh — la cookie refresh_token se envía automáticamente
        await apiClient.post('/auth/refresh', {});

        // Desencolar y reintentar todas las requests
        processRefreshAuthQueue(null);

        // Reintentar la request original (con la nueva access_token cookie)
        return apiClient(originalRequest);
      } catch {
        const refreshError = new ApiClientError(
          401,
          'Sesión expirada. Iniciá sesión nuevamente.',
          'SESSION_EXPIRED',
        );
        processRefreshAuthQueue(refreshError);
        authStoreHelpers.clear();
        // Redirigir al login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshingAuth = false;
      }
    }

    return Promise.reject(toApiClientError(error));
  },
);

// ═════════════════════════════════════════════════════════════════════
//  Wrapper público (compatible con api.ts)
// ═════════════════════════════════════════════════════════════════════

export interface RequestConfig {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  branchId?: string;
}

export async function apiRequest<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const { method = 'GET', body } = config;

  const response = await apiClient.request({
    method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: path,
    data: body,
    _skipAuth: config.skipAuth,
    _branchId: config.branchId,
  } as InternalAxiosRequestConfig & { _skipAuth?: boolean; _branchId?: string });

  if (response.status === 204) return undefined as T;
  return response.data as T;
}

// ═════════════════════════════════════════════════════════════════════
//  Helpers
// ═════════════════════════════════════════════════════════════════════

function toApiClientError(error: AxiosError): ApiClientError | AxiosError {
  if (!error.response) {
    return new ApiClientError(0, error.message ?? 'Error de conexión');
  }

  const errBody = error.response.data as
    | { message?: string | string[]; code?: string; error?: string }
    | undefined;

  const message =
    errBody?.message && typeof errBody.message === 'string'
      ? errBody.message
      : Array.isArray(errBody?.message) && errBody!.message.length > 0
        ? errBody!.message.join(', ')
        : errBody?.error ?? `Error ${error.response.status}`;

  return new ApiClientError(error.response.status, message, errBody?.code);
}
