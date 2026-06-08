/**
 * Mock factories for unit tests.
 *
 * Cada factory devuelve un objeto con todos los métodos como `jest.fn()`
 * con implementaciones por defecto sensatas. Los tests pueden sobreescribir
 * con `.mockResolvedValue()` o `.mockRejectedValue()`.
 */

import { Prisma } from '@prisma/client';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';

// ============================================================
//  Tipos de los modelos Prisma que usamos (para el mockTx)
// ============================================================
type ModelMethodKeys = 'findFirst' | 'findMany' | 'findUnique' | 'create' | 'update' | 'delete' | 'count' | 'updateMany' | 'aggregate';

type ModelMethods = Record<ModelMethodKeys, jest.Mock>;

function createModelMethods(): ModelMethods {
  return {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    aggregate: jest.fn(),
  };
}

// ============================================================
//  PrismaService Mock
// ============================================================
export function createMockPrisma() {
  const modelNames = [
    'order', 'orderItem', 'orderStateLog', 'product',
    'restaurantTable', 'tableStateLog', 'customer', 'cashRegister', 'shift',
    'payment', 'auditLog', 'plan', 'subscription', 'preparationArea',
    'business', 'posStation', 'branch', 'user', 'category',
    'supplier', 'purchase', 'inventoryMovement', 'cashMovement', 'report',
  ] as const;

  // Create model methods eagerly (no Proxy — spread-compatible)
  const models = Object.fromEntries(
    modelNames.map((name) => [name, createModelMethods()]),
  ) as Record<(typeof modelNames)[number], ModelMethods>;

  const mockPrisma = {
    ...models,
    $transaction: jest.fn(),
    tenantFilter: jest.fn(
      (user: AuthenticatedUser, context?: BusinessContext) => ({
        businessId: context?.businessId ?? user.businessId,
        ...(context?.branchId ? { branchId: context.branchId } : {}),
      }),
    ),
  };

  // Por defecto, $transaction ejecuta el callback con el mismo mockPrisma
  // (no un mockTx separado), para que los mocks configurados en el test
  // funcionen tanto dentro como fuera de transactions.
  mockPrisma.$transaction.mockImplementation(
    async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: typeof mockPrisma) => unknown)(mockPrisma);
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg;
    },
  );

  return { mockPrisma, mockTx: mockPrisma };
}

// ============================================================
//  AuditService Mock
// ============================================================
export function createMockAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }),
  };
}

// ============================================================
//  CashFoundationService Mock
// ============================================================
export function createMockCashFoundation() {
  return {
    findOpenCashAndShift: jest.fn().mockResolvedValue({
      cashRegisterId: 'cash-reg-1',
      shiftId: 'shift-1',
    }),
    findOpenCashAndShiftInTx: jest.fn().mockResolvedValue({
      cashRegisterId: 'cash-reg-1',
      shiftId: 'shift-1',
    }),
  };
}

// ============================================================
//  RealtimeGateway Mock
// ============================================================
export function createMockRealtime() {
  return {
    emitOrderCreated: jest.fn(),
    emitOrderStateChanged: jest.fn(),
    emitOrderCancelled: jest.fn(),
    emitOrderItemAdded: jest.fn(),
    emitOrderItemUpdated: jest.fn(),
    emitOrderItemRemoved: jest.fn(),
    emitOrderUpdated: jest.fn(),
    server: undefined,
  };
}

// ============================================================
//  NestJS Dependencies Mock
// ============================================================
export function createMockJwtService() {
  return {
    sign: jest.fn().mockReturnValue('mock-token'),
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    verify: jest.fn().mockReturnValue({ sub: 'user-1', businessId: 'biz-1' }),
    verifyAsync: jest.fn().mockResolvedValue({ sub: 'user-1', businessId: 'biz-1' }),
    decode: jest.fn().mockReturnValue({ sub: 'user-1', businessId: 'biz-1' }),
  };
}

export function createMockConfigService(overrides: Record<string, unknown> = {}) {
  const config: Record<string, unknown> = {
    JWT_SECRET: 'test-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    DATABASE_URL: 'mysql://test:test@localhost:3306/test',
    REDIS_URL: 'redis://localhost:6379',
    ...overrides,
  };
  return {
    get: jest.fn((key: string) => config[key]),
  };
}

// ============================================================
//  BullMQ Queue Mock
// ============================================================
export function createMockQueue() {
  return {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    getJob: jest.fn().mockResolvedValue(null),
    getJobs: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    drain: jest.fn().mockResolvedValue(undefined),
    obliterate: jest.fn().mockResolvedValue(undefined),
  };
}

// ============================================================
//  CacheService Mock
// ============================================================
export function createMockCache() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    delByPattern: jest.fn().mockResolvedValue(undefined),
  };
}

// ============================================================
//  Helper para crear objetos AuthenticatedUser
// ============================================================
export function createTestUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'cashier@test.com',
    businessId: 'biz-1',
    role: 'CASHIER' as any,
    defaultBranchId: 'branch-1',
    permissions: [],
    ...overrides,
  } as AuthenticatedUser;
}

export function createTestContext(overrides: Partial<BusinessContext> = {}): BusinessContext {
  return {
    businessId: 'biz-1',
    branchId: 'branch-1',
    ...overrides,
  };
}

// ============================================================
//  Prisma.Decimal helper
// ============================================================
export const decimal = (value: number | string) => new Prisma.Decimal(value);
