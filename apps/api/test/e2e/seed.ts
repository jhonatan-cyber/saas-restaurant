/**
 * E2E Test Seed
 *
 * Inserta los datos mÃ­nimos necesarios para que las pruebas corran contra
 * una BD real (saas_restaurant_test). Cada suite llama a seed() y luego
 * cleanup() al final.
 *
 * Datos que crea:
 *  - 1 Business (slug: e2e-test)
 *  - 1 Plan (code: E2E_TEST)
 *  - 1 Subscription (plan â†’ business)
 *  - 1 Branch (code: CENTRO)
 *  - 1 Admin user (email: admin@e2e-test.com, pass: TestPass123!)
 *  - 3 Preparation Areas (KITCHEN, BAR, COFFEE)
 *  - 2 Categories
 *  - 4 Products (para crear Ã³rdenes)
 *  - 4 Tables para la branch
 *  - 1 CashRegister OPEN + 1 Shift OPEN
 *  - 1 Customer
 */
import { PrismaClient, Role, BusinessStatus, BranchStatus, UserStatus, ProductType, BillingPeriod, SubscriptionStatus, CashRegisterStatus, ShiftStatus, TableLocation } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';

function parseDbUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    prepareCacheLength: 0,
  };
}

const BUSINESS_SLUG = 'e2e-test';
const ADMIN_EMAIL = 'admin@e2e-test.com';
const ADMIN_PASSWORD = 'TestPass123!';

export interface SeedData {
  businessId: string;
  branchId: string;
  adminUserId: string;
  planId: string;
  productIds: string[];
  tableIds: string[];
  cashRegisterId: string;
  shiftId: string;
  categoryIds: string[];
  prepAreaIds: Record<string, string>;
  customerId: string;
}

export async function seed(dbUrl: string): Promise<SeedData> {
  const adapter = new PrismaMariaDb(parseDbUrl(dbUrl));
  const prisma = new PrismaClient({ adapter });

  try {
    // --- Plan ---
    const plan = await prisma.plan.upsert({
      where: { code: 'E2E_TEST' },
      update: {},
      create: {
        code: 'E2E_TEST',
        name: 'Test Plan',
        price: 0,
        billingPeriod: BillingPeriod.MONTHLY,
        maxUsers: 10,
        maxBranches: 5,
        maxProducts: 100,
        maxCategories: 20,
        maxMonthlyOrders: 9999,
        maxStorageMb: 500,
        features: ['pos_web', 'reports', 'kds'],
        isActive: true,
        isPublic: false,
        sortOrder: 99,
      },
    });

    // --- Business ---
    const business = await prisma.business.upsert({
      where: { slug: BUSINESS_SLUG },
      update: {},
      create: {
        name: 'E2E Test Restaurant',
        slug: BUSINESS_SLUG,
        legalName: 'E2E Test S.R.L.',
        taxId: '9999999999',
        email: 'admin@e2e-test.com',
        phone: '+591 70000000',
        currency: 'BOB',
        timezone: 'America/La_Paz',
        status: BusinessStatus.ACTIVE,
        plan: 'PRO',
        planId: plan.id,
        moduleReports: true,
        moduleInventory: true,
        modulePosStations: true,
        moduleDeliveryApp: false,
      },
    });

    // --- Subscription ---
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    await prisma.subscription.upsert({
      where: { businessId: business.id },
      update: { planId: plan.id },
      create: {
        businessId: business.id,
        planId: plan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    // --- Branch ---
    const branch = await prisma.branch.upsert({
      where: { businessId_code: { businessId: business.id, code: 'CENTRO' } },
      update: {},
      create: {
        businessId: business.id,
        name: 'Sucursal Centro',
        code: 'CENTRO',
        address: 'Av. Test #123',
        phone: '+591 22123456',
        isMain: true,
        status: BranchStatus.ACTIVE,
      },
    });

    // --- Admin user ---
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const admin = await prisma.user.upsert({
      where: { businessId_email: { businessId: business.id, email: ADMIN_EMAIL } },
      update: { passwordHash, defaultBranchId: branch.id },
      create: {
        businessId: business.id,
        email: ADMIN_EMAIL,
        passwordHash,
        fullName: 'Admin E2E',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        defaultBranchId: branch.id,
      },
    });

    // --- Preparation Areas ---
    const prepAreaCodes = ['KITCHEN', 'BAR', 'COFFEE'];
    const prepAreaIds: Record<string, string> = {};
    for (const code of prepAreaCodes) {
      const area = await prisma.preparationArea.upsert({
        where: { businessId_code: { businessId: business.id, code } },
        update: {},
        create: {
          businessId: business.id,
          branchId: null,
          code,
          name: code.charAt(0) + code.slice(1).toLowerCase(),
          description: `${code} area`,
          displayOrder: prepAreaCodes.indexOf(code) + 1,
          isActive: true,
        },
      });
      prepAreaIds[code] = area.id;
    }

    // --- Categories ---
    const catSeed = [
      { slug: 'e2e-entradas', name: 'Entradas E2E', displayOrder: 1 },
      { slug: 'e2e-principales', name: 'Principales E2E', displayOrder: 2 },
    ];
    const categoryIds: string[] = [];
    for (const c of catSeed) {
      // For global categories (branchId=null), use findFirst instead of upsert with compound unique
      // Prisma v7 requires non-null values in compound unique where clauses
      let cat = await prisma.category.findFirst({
        where: { businessId: business.id, slug: c.slug, branchId: null },
      });
      if (!cat) {
        cat = await prisma.category.create({
          data: {
            businessId: business.id,
          branchId: branch.id,
            name: c.name,
            slug: c.slug,
            description: c.name,
            displayOrder: c.displayOrder,
            isActive: true,
          },
        });
      }
      categoryIds.push(cat.id);
    }

    // --- Products ---
    const productSeed = [
      { slug: 'e2e-hamburguesa', name: 'Hamburguesa Test', price: 50, cost: 20, categorySlug: 'e2e-entradas', prepAreaCode: 'KITCHEN', taxRate: 13 },
      { slug: 'e2e-pizza', name: 'Pizza Test', price: 80, cost: 30, categorySlug: 'e2e-principales', prepAreaCode: 'KITCHEN', taxRate: 13 },
      { slug: 'e2e-coca', name: 'Coca Test', price: 10, cost: 4, categorySlug: 'e2e-entradas', prepAreaCode: 'BAR', taxRate: 13 },
      { slug: 'e2e-cafe', name: 'CafÃ© Test', price: 15, cost: 5, categorySlug: 'e2e-entradas', prepAreaCode: 'COFFEE', taxRate: 13 },
    ];
    const productIds: string[] = [];
    for (const p of productSeed) {
      const prod = await prisma.product.upsert({
        where: { businessId_slug: { businessId: business.id, slug: p.slug } },
        update: {},
        create: {
          businessId: business.id,
          branchId: branch.id,
          categoryId: categoryIds[catSeed.findIndex((c) => c.slug === p.categorySlug)],
          preparationAreaId: prepAreaIds[p.prepAreaCode],
          name: p.name,
          slug: p.slug,
          description: p.name,
          price: p.price,
          cost: p.cost,
          taxRate: p.taxRate,
          productType: ProductType.SALE,
          isActive: true,
          isAvailable: true,
        },
      });
      productIds.push(prod.id);
    }

    // --- Tables ---
    const tableSeed = [
      { number: 'E1', capacity: 4 },
      { number: 'E2', capacity: 2 },
      { number: 'E3', capacity: 6 },
      { number: 'E4', capacity: 4 },
    ];
    const tableIds: string[] = [];
    for (const t of tableSeed) {
      const table = await prisma.restaurantTable.upsert({
        where: { businessId_branchId_number: { businessId: business.id, branchId: branch.id, number: t.number } },
        update: {},
        create: {
          businessId: business.id,
          branchId: branch.id,
          number: t.number,
          capacity: t.capacity,
          location: TableLocation.INDOOR,
          status: 'FREE' as any,
          displayOrder: tableSeed.indexOf(t) + 1,
        },
      });
      tableIds.push(table.id);
    }

    // --- Cash Register + Shift ---
    const cashRegister = await prisma.cashRegister.upsert({
      where: { businessId_branchId_code: { businessId: business.id, branchId: branch.id, code: 'CAJA-E2E' } },
      update: {
        status: CashRegisterStatus.OPEN,
        openedByUserId: admin.id,
        openedAt: new Date(),
        closedAt: null,
        closedByUserId: null,
      },
      create: {
        businessId: business.id,
        branchId: branch.id,
        code: 'CAJA-E2E',
        status: CashRegisterStatus.OPEN,
        openedByUserId: admin.id,
      },
    });

    // Close any existing open shifts, then open one
    await prisma.shift.updateMany({
      where: { cashRegisterId: cashRegister.id, status: ShiftStatus.OPEN },
      data: { status: ShiftStatus.CLOSED, closedAt: new Date() },
    });
    const shift = await prisma.shift.create({
      data: {
        businessId: business.id,
        branchId: branch.id,
        cashRegisterId: cashRegister.id,
        userId: admin.id,
        status: ShiftStatus.OPEN,
        openingAmount: 0,
      },
    });

    // --- Customer ---
    const customer = await prisma.customer.upsert({
      where: { id: '00000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: '00000000-0000-0000-0000-000000000001',
        businessId: business.id,
        name: 'Cliente E2E',
        taxId: '9999999',
        taxIdType: 'CI',
        isActive: true,
      },
    });

    return {
      businessId: business.id,
      branchId: branch.id,
      adminUserId: admin.id,
      planId: plan.id,
      productIds,
      tableIds,
      cashRegisterId: cashRegister.id,
      shiftId: shift.id,
      categoryIds,
      prepAreaIds,
      customerId: customer.id,
    };
  } finally {
    await prisma.$disconnect();
  }
}

export async function cleanup(dbUrl: string): Promise<void> {
  const adapter = new PrismaMariaDb(parseDbUrl(dbUrl));
  const prisma = new PrismaClient({ adapter });

  try {
    const business = await prisma.business.findUnique({ where: { slug: BUSINESS_SLUG } });
    if (!business) return;

    const businessId = business.id;

    // Delete in reverse dependency order
    await prisma.orderStateLog.deleteMany({ where: { businessId } });
    await prisma.orderItem.deleteMany({ where: { businessId } });
    await prisma.payment.deleteMany({ where: { businessId } });
    await prisma.order.deleteMany({ where: { businessId } });
    await prisma.shift.deleteMany({ where: { businessId } });
    await prisma.cashRegister.deleteMany({ where: { businessId } });
    await prisma.customer.deleteMany({ where: { businessId } });
    await prisma.restaurantTable.deleteMany({ where: { businessId } });
    await prisma.product.deleteMany({ where: { businessId } });
    await prisma.category.deleteMany({ where: { businessId } });
    await prisma.preparationArea.deleteMany({ where: { businessId } });
    await prisma.auditLog.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.subscription.deleteMany({ where: { businessId } });
    await prisma.branch.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.plan.delete({ where: { code: 'E2E_TEST' } });
  } finally {
    await prisma.$disconnect();
  }
}

export { BUSINESS_SLUG, ADMIN_EMAIL, ADMIN_PASSWORD };
