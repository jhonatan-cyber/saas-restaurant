import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  branchId?: string;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Cliente HTTP básico para la app mobile.
 * Lee el token de SecureStore y lo envía como Authorization.
 */
export async function api<T>(
  path: string,
  options: ApiOptions = {},
  ...rest: string[]
): Promise<T> {
  const { body, skipAuth, branchId, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (!skipAuth) {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  if (branchId) {
    headers['x-branch-id'] = branchId;
  }

  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    ...fetchOptions,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(
      res.status,
      typeof errBody.message === 'string'
        ? errBody.message
        : Array.isArray(errBody.message)
          ? errBody.message.join(', ')
          : 'Error desconocido',
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
