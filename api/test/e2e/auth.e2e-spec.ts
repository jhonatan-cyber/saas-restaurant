import type { NestExpressApplication } from '@nestjs/platform-express';
import { createApp, request } from './setup';
import { seed, cleanup, BUSINESS_SLUG, ADMIN_EMAIL, ADMIN_PASSWORD } from './seed';

/**
 * Helper: parsea el array de Set-Cookie headers y devuelve un map
 * con cookie name → { value, attrs }.
 *
 * Ej: 'access_token=abc; HttpOnly; Path=/' → { access_token: { value: 'abc', attrs: 'HttpOnly; Path=/' } }
 */
function parseCookies(setCookieHeader: string[] | undefined): Record<string, { value: string; attrs: string }> {
  const result: Record<string, { value: string; attrs: string }> = {};
  if (!setCookieHeader) return result;
  for (const entry of setCookieHeader) {
    const [first, ...rest] = entry.split(';').map((s) => s.trim());
    if (!first) continue;
    const eqIdx = first.indexOf('=');
    if (eqIdx === -1) continue;
    const name = first.slice(0, eqIdx);
    const value = first.slice(eqIdx + 1);
    result[name] = { value, attrs: rest.join('; ') };
  }
  return result;
}

/**
 * Helper: construye una Cookie header a partir de un objeto cookies
 * (útil para reenviar cookies en requests posteriores).
 */
function toCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

describe('Auth (E2E)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const dbUrl = process.env.DATABASE_URL!;
    await seed(dbUrl);
    app = await createApp();
  });

  afterAll(async () => {
    if (app) await app.close();
    const dbUrl = process.env.DATABASE_URL!;
    await cleanup(dbUrl);
  });

  // =============================================================
  //  POST /api/auth/login
  // =============================================================
  describe('POST /api/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          businessSlug: BUSINESS_SLUG,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(ADMIN_EMAIL);
    });

    it('sets HttpOnly cookies: access_token, refresh_token, csrf_token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          businessSlug: BUSINESS_SLUG,
        });

      const cookies = parseCookies(res.headers['set-cookie'] as string[] | undefined);

      expect(cookies).toHaveProperty('access_token');
      expect(cookies).toHaveProperty('refresh_token');
      expect(cookies).toHaveProperty('csrf_token');

      // access_token: HttpOnly, path=/, sameSite=lax
      expect(cookies.access_token!.attrs).toContain('HttpOnly');
      expect(cookies.access_token!.attrs).toContain('Path=/');
      expect(cookies.access_token!.attrs.toLowerCase()).toContain('samesite=lax');

      // refresh_token: HttpOnly, path=/api/auth/refresh, sameSite=strict
      expect(cookies.refresh_token!.attrs).toContain('HttpOnly');
      expect(cookies.refresh_token!.attrs).toContain('Path=/api/auth/refresh');
      expect(cookies.refresh_token!.attrs.toLowerCase()).toContain('samesite=strict');

      // csrf_token: NO HttpOnly, path=/
      expect(cookies.csrf_token!.attrs).not.toContain('HttpOnly');
      expect(cookies.csrf_token!.attrs).toContain('Path=/');
    });

    it('returns tokens in body for backward compat (mobile)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          businessSlug: BUSINESS_SLUG,
        });

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(typeof res.body.accessToken).toBe('string');
      expect(typeof res.body.refreshToken).toBe('string');
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
    });

    it('returns 401 with wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: ADMIN_EMAIL,
          password: 'wrong-password-123',
          businessSlug: BUSINESS_SLUG,
        });

      expect(res.status).toBe(401);
    });

    it('returns 401 with unknown slug', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          businessSlug: 'nonexistent',
        });

      expect(res.status).toBe(401);
    });

    it('returns 400 with invalid email format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: ADMIN_PASSWORD,
          businessSlug: BUSINESS_SLUG,
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 without required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // =============================================================
  //  GET /api/auth/me
  // =============================================================
  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          businessSlug: BUSINESS_SLUG,
        });
      accessToken = res.body.accessToken;
    });

    it('returns authenticated user with Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(ADMIN_EMAIL);
      expect(res.body).toHaveProperty('business');
      expect(res.body).toHaveProperty('branches');
    });

    it('returns authenticated user via HttpOnly cookie', async () => {
      // Login again to get fresh cookies
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          businessSlug: BUSINESS_SLUG,
        });

      const cookies = parseCookies(loginRes.headers['set-cookie'] as string[] | undefined);
      const cookieHeader = toCookieHeader({
        access_token: cookies.access_token!.value,
        csrf_token: cookies.csrf_token!.value,
      });

      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookieHeader);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(ADMIN_EMAIL);
      expect(res.body).toHaveProperty('business');
      expect(res.body).toHaveProperty('branches');
    });

    it('returns 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me');

      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  // =============================================================
  //  POST /api/auth/refresh
  // =============================================================
  describe('POST /api/auth/refresh', () => {
    let refreshCookieValue: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          businessSlug: BUSINESS_SLUG,
        });
      const cookies = parseCookies(res.headers['set-cookie'] as string[] | undefined);
      refreshCookieValue = cookies.refresh_token!.value;
    });

    it('refreshes access token and sets new access_token cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        // Enviar refresh_token como cookie (no Bearer) para verificar el flujo cookies
        .set('Cookie', `refresh_token=${refreshCookieValue}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('expiresIn');

      // Debe setear una nueva cookie access_token
      const cookies = parseCookies(res.headers['set-cookie'] as string[] | undefined);
      expect(cookies).toHaveProperty('access_token');
      expect(cookies.access_token!.attrs).toContain('HttpOnly');
    });

    it('refreshes access token via Bearer header (backward compat)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${refreshCookieValue}`)
        .send({ refreshToken: refreshCookieValue });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('expiresIn');
    });

    it('returns 401 without refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(401);
    });
  });

  // =============================================================
  //  POST /api/auth/logout
  // =============================================================
  describe('POST /api/auth/logout', () => {
    it('clears all auth cookies', async () => {
      // Login first
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          businessSlug: BUSINESS_SLUG,
        });

      const loginCookies = parseCookies(loginRes.headers['set-cookie'] as string[] | undefined);
      const cookieHeader = toCookieHeader({
        access_token: loginCookies.access_token!.value,
        refresh_token: loginCookies.refresh_token!.value,
        csrf_token: loginCookies.csrf_token!.value,
      });

      // Logout
      const logoutRes = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookieHeader);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body).toEqual({ message: 'Sesión cerrada exitosamente' });

      // Verificar que las cookies se limpiaron (Set-Cookie con valor vacío y Max-Age=0)
      const logoutCookies = parseCookies(logoutRes.headers['set-cookie'] as string[] | undefined);
      expect(logoutCookies).toHaveProperty('access_token');
      expect(logoutCookies.access_token!.value).toBe('');
      expect(logoutCookies).toHaveProperty('refresh_token');
      expect(logoutCookies.refresh_token!.value).toBe('');
      expect(logoutCookies).toHaveProperty('csrf_token');
      expect(logoutCookies.csrf_token!.value).toBe('');
    });
  });
});
