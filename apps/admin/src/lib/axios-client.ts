/**
 * Cliente Axios con interceptores globales para el Admin Panel.
 *
 * - Request interceptor: adjunta token y headers multi-tenant.
 * - Response interceptor: captura 401, refresca token automáticamente,
 *   encola requests concurrentes durante el refresh.
 *
 * Sigue el mismo patrón que apps/mobile/src/lib/api-client.ts.
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { HEADERS } from '@saas/shared';
import { useAuthStore, authStoreHelpers } from './auth-store';

const isBrowser = typeof window !== 'undefined';

const API_BASE_URL = isBrowser
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3001/api')
  : (process.env.API_INTERNAL_URL || import.meta.env.VITE_API_URL || 'http://api:3001/api');

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
    if (state.accessToken) {
      config.headers.Authorization = `Bearer ${state.accessToken}`;
    }
    if (state.user?.businessId) {
      config.headers[HEADERS.BUSINESS_ID] = state.user.businessId;
    }
    if (custom._branchId) {
      config.headers[HEADERS.BRANCH_ID] = custom._branchId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ═════════════════════════════════════════════════════════════════════
//  REFRESH QUEUE
// ═════════════════════════════════════════════════════════════════════

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null): void {
  for (const { resolve, reject } of failedQueue) {
    if (error) {
      reject(error);
    } else {
      resolve(token!);
    }
  }
  failedQueue = [];
}

// ═════════════════════════════════════════════════════════════════════
//  RESPONSE INTERCEPTOR
// ═════════════════════════════════════════════════════════════════════

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean; _skipAuth?: boolean; _branchId?: string })
      | undefined;

    if (!originalRequest) {
      return Promise.reject(toApiClientError(error));
    }

    // Solo intentar refresh en 401 de requests autenticadas que no sean de refresh
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry ||
      originalRequest._skipAuth
    ) {
      return Promise.reject(toApiClientError(error));
    }

    // Si ya se está refrescando, encolar
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      });
    }

    // Iniciar refresh
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = authStoreHelpers.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No hay refresh token');
      }

      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

      // Actualizar tokens en el store
      authStoreHelpers.setAuthTokens(data.accessToken, data.refreshToken);

      // Desencolar
      processQueue(null, data.accessToken);

      // Reintentar original
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      const normalizedError = new ApiClientError(
        401,
        'Sesión expirada. Iniciá sesión nuevamente.',
        'SESSION_EXPIRED',
      );
      processQueue(normalizedError);
      authStoreHelpers.clear();
      return Promise.reject(normalizedError);
    } finally {
      isRefreshing = false;
    }
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
