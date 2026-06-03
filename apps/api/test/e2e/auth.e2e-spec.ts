import type { NestExpressApplication } from '@nestjs/platform-express';
import { createApp, request } from './setup';
import { seed, cleanup, BUSINESS_SLUG, ADMIN_EMAIL, ADMIN_PASSWORD } from './seed';

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

    it('returns authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

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
    let refreshToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          businessSlug: BUSINESS_SLUG,
        });
      refreshToken = res.body.refreshToken;
    });

    it('refreshes access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Authorization', `Bearer ${refreshToken}`)
        .send({});

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
});
