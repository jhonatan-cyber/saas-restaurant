/**
 * API de autenticación para el panel Admin.
 */
import { apiRequest, setCurrentUser, initCsrf } from './client';
import type { AuthUser } from './types';

export const authApi = {
  /** Login unificado: sin businessSlug → SaaS admin. El backend setea cookies HttpOnly. */
  login: (data: { email: string; password: string }) =>
    apiRequest<{ accessToken: string; refreshToken: string; user: AuthUser }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify(data), skipAuth: true },
    ),

  /** Obtiene el usuario actual desde las cookies (verifica validez). */
  me: () =>
    apiRequest<AuthUser>('/admin/auth/me'),

  /** Cierra sesión: el backend limpia las cookies HttpOnly. */
  logout: () =>
    apiRequest<{ message: string }>('/auth/logout', { method: 'POST', skipAuth: true }),

  /** Inicializa CSRF y guarda usuario en memoria después del login. */
  async doLogin(email: string, password: string): Promise<AuthUser> {
    const data = await this.login({ email, password });
    setCurrentUser(data.user);
    await initCsrf().catch(() => {});
    return data.user;
  },

  async doLogout(): Promise<void> {
    try {
      await this.logout();
    } catch {
      // Ignorar errores de logout
    }
    setCurrentUser(null);
  },
};