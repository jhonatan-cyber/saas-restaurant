import type { NestExpressApplication } from '@nestjs/platform-express';
import { createApp, request } from './setup';
import { seed, cleanup, BUSINESS_SLUG, ADMIN_EMAIL, ADMIN_PASSWORD } from './seed';

/**
 * Plans E2E tests.
 *
 * Los planes son accesibles sin autenticación para usuarios públicos
 * (listPublic), pero requieren SUPER_ADMIN para CRUD.
 * El usuario seed es ADMIN, no SUPER_ADMIN, así que el CRUD devuelve 403.
 * Para el CRUD completo se necesitaría un usuario SUPER_ADMIN.
 */
describe('Plans (E2E)', () => {
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
  //  GET /api/plans/public
  // =============================================================
  describe('GET /api/plans/public', () => {
    it('returns public plans without auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/plans/public');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // =============================================================
  //  CRUD (requiere SUPER_ADMIN) — esperamos 403 con role ADMIN
  // =============================================================
  describe('CRUD as ADMIN (not SUPER_ADMIN)', () => {
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

    it('POST /api/plans returns 403 for non-super-admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/plans')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          code: 'FORBIDDEN',
          name: 'Should Not Create',
          price: 0,
          currency: 'USD',
          billingPeriod: 'MONTHLY',
          maxUsers: 1,
          maxBranches: 1,
          maxProducts: 1,
          maxCategories: 1,
          maxMonthlyOrders: 1,
          maxStorageMb: 1,
        });

      expect(res.status).toBe(403);
    });

    it('GET /api/plans returns 403 for non-super-admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/plans')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/plans/:id returns 403 for non-super-admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/plans/some-id')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(403);
    });
  });

  // =============================================================
  //  Public endpoint: is accessible without JWT
  // =============================================================
  describe('Plans public endpoint without auth', () => {
    it('GET /api/plans/public returns plans array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/plans/public');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
