import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

/**
 * Servicio centralizado para manejar cookies de autenticación.
 *
 * Extraído de AuthController para que cualquier controlador pueda
 * setear/limpiar cookies sin duplicar la lógica.
 *
 * Cookies manejadas:
 *  - `access_token`  (HttpOnly, path=/)          → JWT de acceso (15 min)
 *  - `refresh_token` (HttpOnly, path=/{prefix}/auth/refresh) → JWT de refresh (7 días)
 *  - `csrf_token`    (no HttpOnly, path=/)       → token CSRF (Double Submit Cookie)
 *
 * El path del refresh_token se deriva dinámicamente de API_GLOBAL_PREFIX
 * para que la cookie solo se envíe al endpoint de refresh, maximizando
 * la seguridad.
 */
@Injectable()
export class AuthCookiesService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Path de la cookie refresh_token, derivado del global prefix.
   * Ejemplo: con prefix='api' → '/api/auth/refresh'
   */
  get refreshCookiePath(): string {
    const prefix = this.config.get<string>('API_GLOBAL_PREFIX', 'api');
    return prefix ? `/${prefix}/auth/refresh` : '/auth/refresh';
  }

  /**
   * Setea cookies de access y refresh token (login).
   */
  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    this.setAccessCookie(res, accessToken);
    this.setRefreshCookie(res, refreshToken);
  }

  /**
   * Cookie del access token (HttpOnly, 15 min, path=/).
   */
  setAccessCookie(res: Response, token: string): void {
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutos
    });
  }

  /**
   * Cookie del refresh token (HttpOnly, 7 días, path restringido).
   * El path es solo `/api/auth/refresh` (o el prefix que corresponda)
   * para que el navegador solo la envíe al endpoint de refresh.
   */
  setRefreshCookie(res: Response, token: string): void {
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: this.refreshCookiePath,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    });
  }

  /**
   * Cookie del token CSRF (NO HttpOnly para que JS la lea, path=/).
   */
  setCsrfCookie(res: Response, token: string): void {
    res.cookie('csrf_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }

  /**
   * Limpia todas las cookies de autenticación (logout).
   */
  clearAuthCookies(res: Response): void {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: this.refreshCookiePath });
    res.clearCookie('csrf_token', { path: '/' });
  }
}
