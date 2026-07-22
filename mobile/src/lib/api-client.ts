/**
 * Cliente HTTP con Axios + interceptor global de refresh token.
 *
 * Diferencias con la versión anterior (fetch):
 *  - Axios maneja timeouts, transformación de errores y serialización.
 *  - Interceptor de request: adjunta token + branch-id automáticamente.
 *  - Interceptor de response: captura 401, encola requests concurrentes
 *    mientras refresca el token, y las reintenta con el nuevo token.
 *  - La cola evita N refrescos simultáneos (solo uno a la vez).
 *
 * La función `apiRequest` mantiene la misma firma que la versión fetch
 * para que hooks.ts y las pantallas NO requieran cambios.
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';

// ── Constantes ────────────────────────────────────────────────────────

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'auth_refresh',
  USER: 'auth_user',
} as const;

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

// ── Auth failure callback ─────────────────────────────────────────────

let onAuthFailure: (() => void) | null = null;

export function setOnAuthFailure(cb: () => void): void {
  onAuthFailure = cb;
}

// ── Extensión de config para datos custom ─────────────────────────────

interface CustomRequestConfig extends InternalAxiosRequestConfig {
  _skipAuth?: boolean;
  _branchId?: string;
  _retry?: boolean;
}

// ── Instancia Axios ───────────────────────────────────────────────────

const api = axios.create({
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

api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const custom = config as CustomRequestConfig;

    // Si la request no requiere auth, saltar
    if (custom._skipAuth) return config;

    const accessToken = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    if (custom._branchId) {
      config.headers['x-branch-id'] = custom._branchId;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ═════════════════════════════════════════════════════════════════════
//  REFRESH QUEUE
// ═════════════════════════════════════════════════════════════════════
//  Mientras se refresca el token, las requests que fallen con 401 se
//  encolan y se reintentan automáticamente con el nuevo token.

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

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomRequestConfig | undefined;

    // ── Guard: error.config puede ser null (request cancelada, error de red previo) ─
    if (!originalRequest) {
      return Promise.reject(toApiClientError(error));
    }

    // ── Condiciones para NO intentar refresh ────────────────────────
    // 1. Error de red (sin response)
    // 2. No es 401
    // 3. Ya se reintentó esta request (evita loops infinitos)
    // 4. La request es de auth (skipAuth)
    if (
      !error.response ||
      error.response.status !== 401 ||
      originalRequest._retry ||
      originalRequest._skipAuth
    ) {
      return Promise.reject(toApiClientError(error));
    }

    // ── Si ya hay un refresh en curso, encolar esta request ─────────
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      });
    }

    // ── Iniciar refresh ────────────────────────────────────────────
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await SecureStore.getItemAsync(AUTH_STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No hay refresh token almacenado');
      }

      // Llamada al endpoint de refresh (usando axios directo, sin interceptor)
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });

      // Guardar nuevos tokens
      await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
      if (data.refreshToken) {
        await SecureStore.setItemAsync(AUTH_STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
      }

      // Reintentar todas las requests encoladas
      processQueue(null, data.accessToken);

      // Reintentar la request original
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      // El refresh falló: normalizar el error para TODAS las requests
      // (tanto la original como las encoladas reciben el mismo ApiClientError)
      const normalizedError = new ApiClientError(
        401,
        'Sesión expirada. Iniciá sesión nuevamente.',
        'SESSION_EXPIRED',
      );

      // Rechazar todas las requests encoladas con el mismo error normalizado
      processQueue(normalizedError);

      // Limpiar sesión
      onAuthFailure?.();

      return Promise.reject(normalizedError);
    } finally {
      isRefreshing = false;
    }
  },
);

// ═════════════════════════════════════════════════════════════════════
//  API Request (wrapper público, compatible con hooks.ts)
// ═════════════════════════════════════════════════════════════════════

interface RequestConfig {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Si true, no adjunta el token Authorization. */
  skipAuth?: boolean;
  /** Si se provee, lo envía como header x-branch-id. */
  branchId?: string;
}

/**
 * Función principal para hacer requests a la API.
 * Compatible con la firma anterior (fetch) para que hooks.ts
 * y las pantallas no requieran cambios.
 */
export async function apiRequest<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const { method = 'GET', body } = config;

  const response = await api.request({
    method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: path,
    data: body,
    _skipAuth: config.skipAuth,
    _branchId: config.branchId,
  } as CustomRequestConfig);

  // 204 No Content: devolver undefined
  if (response.status === 204) {
    return undefined as T;
  }

  return response.data as T;
}

// ═════════════════════════════════════════════════════════════════════
//  Helpers
// ═════════════════════════════════════════════════════════════════════

/**
 * Convierte un error de Axios en ApiClientError.
 * Si el error no es de Axios, lo devuelve tal cual.
 */
function toApiClientError(error: AxiosError): ApiClientError | AxiosError {
  if (!error.response) {
    // Error de red / timeout
    return new ApiClientError(0, error.message ?? 'Error de conexión');
  }

  const errBody = error.response.data as { message?: string | string[]; code?: string } | undefined;

  const message = errBody?.message
    ? typeof errBody.message === 'string'
      ? errBody.message
      : errBody.message.join(', ')
    : `Error ${error.response.status}`;

  return new ApiClientError(error.response.status, message, errBody?.code);
}
