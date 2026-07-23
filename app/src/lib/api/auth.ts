import { type AuthenticatedUserDTO } from '@saas/shared';
import { api } from './index';

export interface LoginRequest {
  email: string;
  password: string;
  businessSlug: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUserDTO;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export const authApi = {
  login: (data: LoginRequest) =>
    api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: data,
      skipAuth: true,
    }),

  me: () => api<AuthenticatedUserDTO>('/auth/me', { method: 'GET' }),

  logout: () => api<{ message: string }>('/auth/logout', { method: 'POST', skipAuth: true }),

  getCsrfToken: () => api<{ csrfToken: string }>('/auth/csrf-token', { method: 'GET', skipAuth: true }),

  stationLogin: (businessSig: string) =>
    api<LoginResponse>('/pos-stations/station-login', {
      method: 'POST',
      body: { businessSig },
      skipAuth: true,
    }),
};
