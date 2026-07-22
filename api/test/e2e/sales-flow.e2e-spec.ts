import type { NestExpressApplication } from '@nestjs/platform-express';
import { createApp, request } from './setup';
import { seed, cleanup, BUSINESS_SLUG, ADMIN_EMAIL, ADMIN_PASSWORD } from './seed';

/**
 * Sales Flow E2E Test (F7-06).
 *
 * Flujo completo de venta:
 *   login → ver turno abierto → crear orden → cocina → pagar → cerrar turno
 *
 * Requiere: business, branch, products, cash register + shift OPEN (seed).
 */
describe('Sales Flow (E2E)', () => {
  let app: NestExpressApplication;
  let accessToken: string;
  let branchId: string;
  let shiftId: string;
  let orderId: string;
  let productId: string;
  let orderTotal: number;

  beforeAll(async () => {
    const dbUrl = process.env.DATABASE_URL!;
    const data = await seed(dbUrl);
    branchId = data.branchId;
    productId = data.productIds[0]!; // e2e-hamburguesa (precio: 50)

    app = await createApp();

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        businessSlug: BUSINESS_SLUG,
      });
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (app) await app.close();
    const dbUrl = process.env.DATABASE_URL!;
    await cleanup(dbUrl);
  });

  // =============================================================
  //  1. Verificar turno abierto (viene del seed)
  // =============================================================
  describe('Step 1: Verify open shift', () => {
    it('gets the current open shift', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/cash/shifts/current')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ branchId });

      expect(res.status).toBe(200);
      expect(res.body.shift).not.toBeNull();
      expect(res.body.shift).toHaveProperty('id');
      expect(res.body.shift).toHaveProperty('openingAmount', '0');
      shiftId = res.body.shift.id;
    });
  });

  // =============================================================
  //  2. Crear orden con 2 items
  // =============================================================
  describe('Step 2: Create order', () => {
    it('creates a DINE_IN order with 2 hamburguesas', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-branch-id', branchId)
        .send({
          items: [
            { productId, quantity: 2, notes: 'Sin cebolla' },
          ],
          type: 'DINE_IN',
          channel: 'POS_WEB',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('PENDING');
      expect(res.body.items).toHaveLength(1);
      expect(res.body.cashRegisterId).toBeTruthy();
      expect(res.body.shiftId).toBeTruthy();
      orderId = res.body.id;
      // Hamburguesa price=50, qty=2, taxRate=13%
      // subtotal = 100, taxTotal = 26, total = 126
      orderTotal = Number(res.body.total);
      expect(orderTotal).toBeGreaterThan(0);
    });
  });

  // =============================================================
  //  3. Transicionar orden por toda la cadena hasta DELIVERED
  // =============================================================
  describe('Step 3: Transition order to DELIVERED', () => {
    it('transitions PENDING → SENT_TO_KITCHEN', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-branch-id', branchId)
        .send({ to: 'SENT_TO_KITCHEN' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SENT_TO_KITCHEN');
    });

    it('transitions SENT_TO_KITCHEN → IN_PREPARATION', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-branch-id', branchId)
        .send({ to: 'IN_PREPARATION' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IN_PREPARATION');
    });

    it('transitions IN_PREPARATION → READY', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-branch-id', branchId)
        .send({ to: 'READY' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('READY');
    });

    it('transitions READY → DELIVERED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/orders/${orderId}/transition`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-branch-id', branchId)
        .send({ to: 'DELIVERED' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DELIVERED');
    });
  });

  // =============================================================
  //  4. Pagar la orden (efectivo)
  // =============================================================
  describe('Step 4: Pay order', () => {
    it('pays the order with CASH', async () => {
      // Pay exact amount
      const res = await request(app.getHttpServer())
        .post(`/api/payments/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-branch-id', branchId)
        .send({
          payments: [
            { method: 'CASH', amount: orderTotal, tendered: orderTotal + 20 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('order');
      expect(res.body.order.status).toBe('PAID');
      expect(res.body.order.payments).toHaveLength(1);
      expect(res.body.order.payments[0]!.method).toBe('CASH');
      expect(res.body.order.payments[0]!.amount).toBe(String(orderTotal));
      // change = tendered - amount = 20
      expect(Number(res.body.order.payments[0]!.change)).toBe(20);
    });

    it('returns 409 paying an already paid order', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/payments/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-branch-id', branchId)
        .send({
          payments: [{ method: 'CASH', amount: orderTotal }],
        });

      expect(res.status).toBe(409);
    });
  });

  // =============================================================
  //  5. Cerrar el turno
  // =============================================================
  describe('Step 5: Close shift', () => {
    it('performs arqueo (preview) before closing', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/cash/shifts/${shiftId}/arqueo`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-branch-id', branchId);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('openingAmount');
      expect(res.body).toHaveProperty('cashPaymentsTotal');
      expect(res.body).toHaveProperty('expectedAmount');
      // openingAmount=0, cashPaymentsTotal=orderTotal, movsIn=0, movsOut=0
      expect(Number(res.body.cashPaymentsTotal)).toBe(orderTotal);
      expect(Number(res.body.expectedAmount)).toBe(Number(res.body.openingAmount) + orderTotal);
    });

    it('closes the shift', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/cash/shifts/${shiftId}/close`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-branch-id', branchId)
        .send({
          closingAmount: orderTotal, // exact amount (no difference)
          closingNotes: 'Cierre E2E test',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('CLOSED');
      expect(res.body.openingAmount).toBe('0');
      // closingAmount matches expected (opening + cash payments)
      expect(Number(res.body.closingAmount)).toBe(orderTotal);
      expect(res.body.difference).toBe('0');
      expect(res.body).toHaveProperty('closedAt');
    });

    it('returns 404 closing an already closed shift', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/cash/shifts/${shiftId}/close`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-branch-id', branchId)
        .send({ closingAmount: 0 });

      expect(res.status).toBe(404);
    });
  });

  // =============================================================
  //  6. Verificaciones finales
  // =============================================================
  describe('Step 6: Verify final state', () => {
    it('lists payments for the order', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/payments/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-branch-id', branchId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]!.method).toBe('CASH');
      expect(Number(res.body[0]!.amount)).toBe(orderTotal);
    });

    it('the order is PAID with state logs', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-branch-id', branchId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PAID');
      // All 5 transitions (PENDING → SENT_TO_KITCHEN → IN_PREPARATION → READY → DELIVERED → PAID)
      expect(res.body.stateLogs).toBeDefined();
      expect(res.body.stateLogs.length).toBeGreaterThanOrEqual(5);
    });
  });
});
