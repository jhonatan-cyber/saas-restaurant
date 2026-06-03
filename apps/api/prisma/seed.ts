/**
 * Seed script — Phase 1 + Phase 2.
 *
 * Carga datos demo para el SaaS Restaurant:
 *  - 1 Business (slug: demo)
 *  - 2 Branches (CENTRO main, NORTE)
 *  - 5 Users (uno por rol principal)
 *  - 4 Categories
 *  - 8 Products base + 2 extras (ADDON y SERVICE) [Phase 2]
 *  - 3 Preparation Areas (KITCHEN, BAR, COFFEE) [Phase 2]
 *  - 8 Tables en CENTRO [Phase 2]
 *  - 6 Customers [Phase 2]
 *
 * Ejecutar con: `bun run db:seed`
 *
 * Re-ejecutable: usa `upsert` por claves únicas para no duplicar datos.
 */
import {
  PrismaClient,
  Role,
  BusinessStatus,
  BranchStatus,
  UserStatus,
  ProductType,
  TableStatus,
  TableLocation,
  CashRegisterStatus,
  ShiftStatus,
  BillingPeriod,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

/**
 * Parses a mysql:// or mariadb:// URL into a config object.
 * Avoids the mariadb package's buggy URL parser on Windows.
 */
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

const adapter = new PrismaMariaDb(parseDbUrl(process.env.DATABASE_URL!));
const prisma = new PrismaClient({ adapter });

const BCRYPT_ROUNDS = 10;

interface UserSeed {
  email: string;
  password: string;
  fullName: string;
  role: Role;
  branchCode?: string;
}

const USERS: UserSeed[] = [
  {
    email: '[email protected]',
    password: 'Owner123!',
    fullName: 'Carlos Propietario',
    role: Role.OWNER,
  },
  {
    email: '[email protected]',
    password: 'Admin123!',
    fullName: 'Ana Administradora',
    role: Role.ADMIN,
  },
  {
    email: '[email protected]',
    password: 'Cajero123!',
    fullName: 'Luis Cajero',
    role: Role.CAJERO,
    branchCode: 'CENTRO',
  },
  {
    email: '[email protected]',
    password: 'Mesero123!',
    fullName: 'María Mesera',
    role: Role.MESERO,
    branchCode: 'CENTRO',
  },
  {
    email: '[email protected]',
    password: 'Cocina123!',
    fullName: 'Pedro Cocinero',
    role: Role.COCINA,
    branchCode: 'CENTRO',
  },
];

interface CategorySeed {
  slug: string;
  name: string;
  description: string;
  displayOrder: number;
}

const CATEGORIES: CategorySeed[] = [
  { slug: 'entradas', name: 'Entradas', description: 'Para abrir el apetito', displayOrder: 1 },
  { slug: 'principales', name: 'Platos Principales', description: 'Lo mejor de la casa', displayOrder: 2 },
  { slug: 'bebidas', name: 'Bebidas', description: 'Refrescos, jugos y más', displayOrder: 3 },
  { slug: 'postres', name: 'Postres', description: 'El toque dulce', displayOrder: 4 },
];

interface ProductSeed {
  slug: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  categorySlug: string;
  taxRate: number;
  productType?: ProductType;
  prepAreaCode?: string;
  minStock?: number;
  trackStock?: boolean;
  preparationTimeMin?: number;
}

const PRODUCTS: ProductSeed[] = [
  // Entradas
  {
    slug: 'pique-macho',
    name: 'Pique Macho',
    description: 'Trozos de carne, salchicha, llajwa y huevo',
    price: 65.0,
    cost: 28.0,
    categorySlug: 'entradas',
    taxRate: 13,
    prepAreaCode: 'KITCHEN',
    preparationTimeMin: 18,
  },
  {
    slug: 'salteñas',
    name: 'Salteñas (2 und)',
    description: 'Salteñas tradicionales bolivianas horneadas',
    price: 24.0,
    cost: 9.0,
    categorySlug: 'entradas',
    taxRate: 13,
    prepAreaCode: 'KITCHEN',
    preparationTimeMin: 5,
    minStock: 20,
    trackStock: true,
  },
  // Principales
  {
    slug: 'silpancho',
    name: 'Silpancho',
    description: 'Carne empanizada con arroz, papa y huevo',
    price: 55.0,
    cost: 22.0,
    categorySlug: 'principales',
    taxRate: 13,
    prepAreaCode: 'KITCHEN',
    preparationTimeMin: 20,
  },
  {
    slug: 'lomo-montado',
    name: 'Lomo Montado',
    description: 'Lomo de res sobre arroz con plátano frito',
    price: 75.0,
    cost: 32.0,
    categorySlug: 'principales',
    taxRate: 13,
    prepAreaCode: 'KITCHEN',
    preparationTimeMin: 22,
  },
  {
    slug: 'trucha-amazonica',
    name: 'Trucha Amazónica',
    description: 'Trucha fresca con guarnición de quinoa',
    price: 70.0,
    cost: 30.0,
    categorySlug: 'principales',
    taxRate: 13,
    prepAreaCode: 'KITCHEN',
    preparationTimeMin: 18,
  },
  // Bebidas
  {
    slug: 'coca-cola-500',
    name: 'Coca-Cola 500ml',
    description: 'Gaseosa en botella personal',
    price: 12.0,
    cost: 5.0,
    categorySlug: 'bebidas',
    taxRate: 13,
    prepAreaCode: 'BAR',
    minStock: 24,
    trackStock: true,
  },
  {
    slug: 'cafe-americano',
    name: 'Café Americano',
    description: 'Café de filtro 250ml, recién hecho',
    price: 15.0,
    cost: 4.0,
    categorySlug: 'bebidas',
    taxRate: 13,
    prepAreaCode: 'COFFEE',
    preparationTimeMin: 4,
    minStock: 50,
    trackStock: true,
  },
  {
    slug: 'api-morado',
    name: 'Api Morado',
    description: 'Bebida caliente de maíz morado con canela',
    price: 15.0,
    cost: 4.0,
    categorySlug: 'bebidas',
    taxRate: 13,
    prepAreaCode: 'COFFEE',
    preparationTimeMin: 6,
  },
  // Postres
  {
    slug: 'helado-canela',
    name: 'Helado de Canela',
    description: 'Helado artesanal de canela con miel',
    price: 22.0,
    cost: 7.0,
    categorySlug: 'postres',
    taxRate: 13,
    prepAreaCode: 'KITCHEN',
    preparationTimeMin: 3,
    minStock: 10,
    trackStock: true,
  },
  {
    slug: 'flan-caramelo',
    name: 'Flan de Caramelo',
    description: 'Flan casero con caramelo y crema',
    price: 20.0,
    cost: 6.0,
    categorySlug: 'postres',
    taxRate: 13,
    prepAreaCode: 'KITCHEN',
    preparationTimeMin: 3,
  },
  // Phase 2 extras
  {
    slug: 'extra-queso',
    name: 'Extra Queso',
    description: 'Porción adicional de queso cheddar',
    price: 8.0,
    cost: 2.5,
    categorySlug: 'entradas',
    taxRate: 13,
    productType: ProductType.ADDON,
    prepAreaCode: 'KITCHEN',
  },
  {
    slug: 'cover-charge',
    name: 'Cover Charge',
    description: 'Cargo de servicio por persona (cubierto)',
    price: 5.0,
    cost: 0,
    categorySlug: 'entradas',
    taxRate: 13,
    productType: ProductType.SERVICE,
  },
];

interface PreparationAreaSeed {
  code: string;
  name: string;
  description: string;
  displayOrder: number;
}

const PREP_AREAS: PreparationAreaSeed[] = [
  {
    code: 'KITCHEN',
    name: 'Cocina',
    description: 'Estación principal de cocina caliente',
    displayOrder: 1,
  },
  {
    code: 'BAR',
    name: 'Bar',
    description: 'Bebidas alcohólicas y refrescos',
    displayOrder: 2,
  },
  {
    code: 'COFFEE',
    name: 'Cafetería',
    description: 'Café, infusiones y bebidas calientes',
    displayOrder: 3,
  },
];

interface TableSeed {
  number: string;
  capacity: number;
  location: TableLocation;
  notes?: string;
  displayOrder: number;
  posX?: number;
  posY?: number;
}

const TABLES_CENTRO: TableSeed[] = [
  // Indoor
  { number: 'M1', capacity: 4, location: TableLocation.INDOOR, displayOrder: 1, posX: 1, posY: 1, notes: 'Mesa cerca de la ventana' },
  { number: 'M2', capacity: 4, location: TableLocation.INDOOR, displayOrder: 2, posX: 2, posY: 1 },
  { number: 'M3', capacity: 6, location: TableLocation.INDOOR, displayOrder: 3, posX: 3, posY: 1, notes: 'Mesa familiar' },
  { number: 'M4', capacity: 2, location: TableLocation.INDOOR, displayOrder: 4, posX: 1, posY: 2, notes: 'Mesa romántica' },
  // Outdoor / Terrace
  { number: 'T1', capacity: 4, location: TableLocation.OUTDOOR, displayOrder: 5, posX: 1, posY: 3, notes: 'Terraza' },
  { number: 'T2', capacity: 4, location: TableLocation.OUTDOOR, displayOrder: 6, posX: 2, posY: 3, notes: 'Terraza' },
  // Bar
  { number: 'B1', capacity: 2, location: TableLocation.BAR, displayOrder: 7, posX: 1, posY: 4, notes: 'Sillón de barra' },
  { number: 'B2', capacity: 2, location: TableLocation.BAR, displayOrder: 8, posX: 2, posY: 4, notes: 'Sillón de barra' },
];

interface CustomerSeed {
  name: string;
  taxId?: string;
  taxIdType?: string;
  email?: string;
  phone?: string;
  address?: string;
  addressReference?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  isActive?: boolean;
}

const CUSTOMERS: CustomerSeed[] = [
  {
    name: 'Empresa Andina S.R.L.',
    taxId: '1020304050',
    taxIdType: 'NIT',
    email: '[email protected]',
    phone: '+591 70111222',
    address: 'Av. Ballivián #500, La Paz',
    addressReference: 'Edificio Torre Empresarial, Piso 8',
    notes: 'Cliente corporativo, requiere factura',
    isActive: true,
  },
  {
    name: 'Roberto Mamani Quispe',
    taxId: '1234567',
    taxIdType: 'CI',
    email: '[email protected]',
    phone: '+591 72345678',
    address: 'Calle 21 de Calacoto, La Paz',
    latitude: -16.5403,
    longitude: -68.0817,
    notes: 'Prefiere facturas a nombre de Roberto M.',
  },
  {
    name: 'Distribuidora MX S.A. de C.V.',
    taxId: 'DMC240101AAA',
    taxIdType: 'RFC',
    email: '[email protected]',
    phone: '+52 55 1234 5678',
    address: 'Av. Reforma #250, CDMX',
    notes: 'Cliente internacional (fase 6 los atenderá en su moneda)',
  },
  {
    name: 'Lucía Vargas Mendoza',
    email: '[email protected]',
    phone: '+591 79876543',
    address: 'Zona Villa Fátima, La Paz',
    latitude: -16.4955,
    longitude: -68.1192,
    addressReference: 'Casa rosada, segundo piso',
    notes: 'Alérgica a frutos secos',
  },
  {
    name: 'Pedro Conde',
    phone: '+591 71234567',
    notes: 'Cliente frecuente, le gusta el silpancho',
  },
  {
    name: 'Consumidor Final',
    taxIdType: 'CF',
    notes: 'Walk-in por defecto para ventas sin identificación',
    isActive: true,
  },
];

async function main(): Promise<void> {
  console.log('🌱 Iniciando seed...\n');

  // ---- 0. Plans (FASE 6: SaaS) ----
  const plans = {
    FREE: await prisma.plan.upsert({
      where: { code: 'FREE' },
      update: {},
      create: {
        code: 'FREE',
        name: 'Gratuito',
        description: 'Para empezar sin costo',
        price: 0,
        billingPeriod: BillingPeriod.MONTHLY,
        maxUsers: 2,
        maxBranches: 1,
        maxProducts: 30,
        maxCategories: 5,
        maxMonthlyOrders: 200,
        maxStorageMb: 50,
        features: ['pos_web'],
        isActive: true,
        sortOrder: 10,
        isPublic: true,
      },
    }),
    BASIC: await prisma.plan.upsert({
      where: { code: 'BASIC' },
      update: {},
      create: {
        code: 'BASIC',
        name: 'Básico',
        description: 'Para restaurantes pequeños',
        price: 29.99,
        billingPeriod: BillingPeriod.MONTHLY,
        maxUsers: 5,
        maxBranches: 2,
        maxProducts: 100,
        maxCategories: 15,
        maxMonthlyOrders: 1000,
        maxStorageMb: 200,
        features: ['pos_web', 'reports', 'kds', 'multi_branch'],
        isActive: true,
        sortOrder: 20,
        isPublic: true,
      },
    }),
    PRO: await prisma.plan.upsert({
      where: { code: 'PRO' },
      update: {},
      create: {
        code: 'PRO',
        name: 'Profesional',
        description: 'Para restaurantes en crecimiento',
        price: 79.99,
        billingPeriod: BillingPeriod.MONTHLY,
        maxUsers: 15,
        maxBranches: 5,
        maxProducts: 500,
        maxCategories: 50,
        maxMonthlyOrders: 5000,
        maxStorageMb: 1000,
        features: ['pos_web', 'reports', 'inventory', 'kds', 'multi_branch', 'desktop_app', 'mobile_app', 'pos_stations'],
        isActive: true,
        sortOrder: 30,
        isPublic: true,
      },
    }),
  };
  console.log(`✅ Planes: ${Object.keys(plans).join(', ')}`);

  // ---- 1. Business ----
  const business = await prisma.business.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Restaurante Demo',
      slug: 'demo',
      legalName: 'Restaurante Demo S.R.L.',
      taxId: '1234567019',
      email: '[email protected]',
      phone: '+591 70123456',
      currency: 'BOB',
      timezone: 'America/La_Paz',
      status: BusinessStatus.ACTIVE,
      plan: 'PRO',
      planId: plans.PRO.id,
      moduleReports: true,
      moduleInventory: true,
      modulePosStations: true,
      moduleDeliveryApp: true,
    },
  });
  console.log(`✅ Business: ${business.name} (slug: ${business.slug})`);

  // ---- 1b. Subscription (FASE 6) ----
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  await prisma.subscription.upsert({
    where: { businessId: business.id },
    update: { planId: plans.PRO.id },
    create: {
      businessId: business.id,
      planId: plans.PRO.id,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });
  console.log(`✅ Suscripción: ${business.name} → PRO`);

  // ---- 2. Branches ----
  const centro = await prisma.branch.upsert({
    where: { businessId_code: { businessId: business.id, code: 'CENTRO' } },
    update: {},
    create: {
      businessId: business.id,
      name: 'Sucursal Centro',
      code: 'CENTRO',
      address: 'Av. Principal #123, La Paz',
      phone: '+591 22123456',
      isMain: true,
      status: BranchStatus.ACTIVE,
    },
  });

  const norte = await prisma.branch.upsert({
    where: { businessId_code: { businessId: business.id, code: 'NORTE' } },
    update: {},
    create: {
      businessId: business.id,
      name: 'Sucursal Norte',
      code: 'NORTE',
      address: 'Av. Las Américas #456, El Alto',
      phone: '+591 28123456',
      isMain: false,
      status: BranchStatus.ACTIVE,
    },
  });
  console.log(`✅ Branches: ${centro.name} (main), ${norte.name}`);

  // ---- 3. Users ----
  const branchMap = new Map<string, string>([
    ['CENTRO', centro.id],
    ['NORTE', norte.id],
  ]);

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
    const defaultBranchId = u.branchCode ? branchMap.get(u.branchCode) ?? null : null;

    await prisma.user.upsert({
      where: {
        businessId_email: {
          businessId: business.id,
          email: u.email,
        },
      },
      update: {
        fullName: u.fullName,
        role: u.role,
        status: UserStatus.ACTIVE,
        defaultBranchId,
      },
      create: {
        businessId: business.id,
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        role: u.role,
        status: UserStatus.ACTIVE,
        defaultBranchId,
      },
    });
    console.log(`  👤 ${u.role.padEnd(10)} ${u.email}`);
  }

  // ---- 4. Categories ----
  const categoryMap = new Map<string, string>();
  for (const c of CATEGORIES) {
    let cat = await prisma.category.findFirst({
      where: { businessId: business.id, branchId: null, slug: c.slug },
    });
    if (cat) {
      cat = await prisma.category.update({
        where: { id: cat.id },
        data: {
          name: c.name,
          description: c.description,
          displayOrder: c.displayOrder,
          isActive: true,
        },
      });
    } else {
      cat = await prisma.category.create({
        data: {
          businessId: business.id,
          branchId: null,
          name: c.name,
          slug: c.slug,
          description: c.description,
          displayOrder: c.displayOrder,
          isActive: true,
        },
      });
    }
    categoryMap.set(c.slug, cat.id);
  }
  console.log(`✅ Categories: ${CATEGORIES.length} creadas/actualizadas`);

  // ---- 5. Preparation Areas (Phase 2) ----
  const prepAreaMap = new Map<string, string>();
  for (const pa of PREP_AREAS) {
    let area = await prisma.preparationArea.findFirst({
      where: { businessId: business.id, branchId: null, code: pa.code },
    });
    if (area) {
      area = await prisma.preparationArea.update({
        where: { id: area.id },
        data: {
          name: pa.name,
          description: pa.description,
          displayOrder: pa.displayOrder,
          isActive: true,
        },
      });
    } else {
      area = await prisma.preparationArea.create({
        data: {
          businessId: business.id,
          branchId: null,
          name: pa.name,
          code: pa.code,
          description: pa.description,
          displayOrder: pa.displayOrder,
          isActive: true,
        },
      });
    }
    prepAreaMap.set(pa.code, area.id);
  }
  console.log(`✅ Preparation Areas: ${PREP_AREAS.length} (${PREP_AREAS.map((p) => p.code).join(', ')})`);

  // ---- 6. Products ----
  for (const p of PRODUCTS) {
    const categoryId = categoryMap.get(p.categorySlug);
    if (!categoryId) {
      console.warn(`  ⚠️  Categoría no encontrada: ${p.categorySlug}, saltando producto ${p.slug}`);
      continue;
    }

    const preparationAreaId = p.prepAreaCode ? prepAreaMap.get(p.prepAreaCode) ?? null : null;

    await prisma.product.upsert({
      where: {
        businessId_slug: {
          businessId: business.id,
          slug: p.slug,
        },
      },
      update: {
        name: p.name,
        description: p.description,
        price: p.price,
        cost: p.cost,
        taxRate: p.taxRate,
        categoryId,
        preparationAreaId,
        productType: p.productType ?? ProductType.SALE,
        preparationTimeMin: p.preparationTimeMin ?? null,
        minStock: p.minStock ?? null,
        trackStock: p.trackStock ?? false,
        isActive: true,
        isAvailable: true,
      },
      create: {
        businessId: business.id,
        branchId: null,
        categoryId,
        preparationAreaId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        cost: p.cost,
        taxRate: p.taxRate,
        productType: p.productType ?? ProductType.SALE,
        preparationTimeMin: p.preparationTimeMin ?? null,
        minStock: p.minStock ?? null,
        trackStock: p.trackStock ?? false,
        isActive: true,
        isAvailable: true,
      },
    });
  }
  console.log(`✅ Products: ${PRODUCTS.length} creados/actualizados`);

  // ---- 7. Tables (Phase 2) ----
  for (const t of TABLES_CENTRO) {
    await prisma.restaurantTable.upsert({
      where: {
        businessId_branchId_number: {
          businessId: business.id,
          branchId: centro.id,
          number: t.number,
        },
      },
      update: {
        capacity: t.capacity,
        location: t.location,
        displayOrder: t.displayOrder,
        notes: t.notes ?? null,
        posX: t.posX ?? null,
        posY: t.posY ?? null,
        // status se preserva en updates: si el operador la dejó en OCCUPIED,
        // no la reseteamos.
      },
      create: {
        businessId: business.id,
        branchId: centro.id,
        number: t.number,
        capacity: t.capacity,
        location: t.location,
        status: TableStatus.FREE,
        displayOrder: t.displayOrder,
        notes: t.notes ?? null,
        posX: t.posX ?? null,
        posY: t.posY ?? null,
      },
    });
  }
  console.log(`✅ Tables: ${TABLES_CENTRO.length} en ${centro.name}`);

  // ---- 8. Customers (Phase 2) ----
  for (const c of CUSTOMERS) {
    // La unicidad por taxId no es estricta (el schema no tiene @@unique sobre
    // taxId porque distintos clientes podrían compartir identificación en
    // casos raros); usamos upsert con taxId+name como heurística.
    const existing = c.taxId
      ? await prisma.customer.findFirst({
          where: { businessId: business.id, taxId: c.taxId, deletedAt: null },
        })
      : null;
    if (existing) continue;

    await prisma.customer.create({
      data: {
        businessId: business.id,
        name: c.name,
        taxId: c.taxId ?? null,
        taxIdType: c.taxIdType ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        address: c.address ?? null,
        addressReference: c.addressReference ?? null,
        latitude: c.latitude ?? null,
        longitude: c.longitude ?? null,
        notes: c.notes ?? null,
        isActive: c.isActive ?? true,
      },
    });
  }
  console.log(`✅ Customers: ${CUSTOMERS.length} cargados`);

  // ---- Caja registradora + turno (F4) ----
  // Abrimos UNA caja en la branch principal con un turno ya OPEN para que
  // el seed quede listo para tomar órdenes sin pasos extra.
  const cajero = USERS.find((u) => u.role === Role.CAJERO);
  if (!cajero) throw new Error('No se encontró el usuario CAJERO en el seed');

  const cajeroUser = await prisma.user.findFirstOrThrow({
    where: { businessId: business.id, email: cajero.email },
  });

  const cashRegister = await prisma.cashRegister.upsert({
    where: { businessId_branchId_code: { businessId: business.id, branchId: centro.id, code: 'CAJA-1' } },
    update: {
      status: CashRegisterStatus.OPEN,
      openedByUserId: cajeroUser.id,
      openedAt: new Date(),
      closedAt: null,
      closedByUserId: null,
    },
    create: {
      businessId: business.id,
      branchId: centro.id,
      code: 'CAJA-1',
      status: CashRegisterStatus.OPEN,
      openedByUserId: cajeroUser.id,
    },
  });

  // Shift único OPEN: si ya hay uno, lo cerramos antes de abrir el nuevo
  // (idempotente). El seed asume arranque limpio.
  await prisma.shift.updateMany({
    where: { cashRegisterId: cashRegister.id, status: ShiftStatus.OPEN },
    data: { status: ShiftStatus.CLOSED, closedAt: new Date() },
  });

  const shift = await prisma.shift.create({
    data: {
      businessId: business.id,
      branchId: centro.id,
      cashRegisterId: cashRegister.id,
      userId: cajeroUser.id,
      status: ShiftStatus.OPEN,
      openingAmount: 0,
    },
  });
  console.log(`✅ Caja + turno inicializados (${cashRegister.code} / shift ${shift.id.slice(-8)})`);

  // ---- Resumen final con credenciales ----
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎉 SEED COMPLETADO');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`\n📍 Business slug: demo`);
  console.log(`\n🔐 Credenciales (todas usan businessSlug="demo"):\n`);
  console.log('  ┌────────────┬──────────────────────────┬─────────────────┐');
  console.log('  │ Role       │ Email                    │ Password        │');
  console.log('  ├────────────┼──────────────────────────┼─────────────────┤');
  for (const u of USERS) {
    console.log(
      `  │ ${u.role.padEnd(10)} │ ${u.email.padEnd(24)} │ ${u.password.padEnd(15)} │`,
    );
  }
  console.log('  └────────────┴──────────────────────────┴─────────────────┘\n');
  console.log('💡 Para probar el login:');
  console.log('   POST http://localhost:3001/api/auth/login');
  console.log('   { "email": "[email protected]", "password": "Owner123!", "businessSlug": "demo" }\n');
  console.log(`📋 Datos adicionales (Phase 2):`);
  console.log(`   - ${PREP_AREAS.length} preparation areas (KITCHEN, BAR, COFFEE)`);
  console.log(`   - ${PRODUCTS.length} products (${PRODUCTS.filter((p) => p.prepAreaCode).length} con prep area, ${PRODUCTS.filter((p) => p.productType && p.productType !== ProductType.SALE).length} no-SALE)`);
  console.log(`   - ${TABLES_CENTRO.length} tables en ${centro.name}`);
  console.log(`   - ${CUSTOMERS.length} customers con distintos taxIdTypes`);
  console.log(`   - 1 caja registradora (${cashRegister.code}) + 1 turno OPEN para que el POS funcione directo\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
