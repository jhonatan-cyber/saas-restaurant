/**
 * Shared helpers for service unit tests.
 *
 * Elimina la duplicación de ~12 líneas por archivo de service spec:
 *   - createMockPrisma(), createMockCache(), etc.
 *   - Test.createTestingModule + providers array + .compile()
 *   - module.get(ServiceClass)
 *
 * Uso típico (servicio con Prisma + Cache):
 *   const { service, prisma, cache } = await buildServiceTest(MyService, {
 *     cache: true,
 *   });
 *
 * Uso con audit:
 *   const { service, prisma, audit } = await buildServiceTest(MyService, {
 *     audit: true,
 *   });
 *
 * Uso con quota:
 *   const { service, prisma, quota } = await buildServiceTest(MyService, {
 *     quota: true,
 *   });
 *
 * Uso con multiples + providers extra:
 *   const { service, prisma, audit, cache } = await buildServiceTest(MyService, {
 *     audit: true, cache: true,
 *     extra: [{ provide: OtherService, useValue: mock }],
 *   });
 *
 * Types for test variables:
 *   let prisma: MockPrisma;
 *   let cache: MockCache;
 *   let audit: MockAudit;
 */
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { QuotaEnforcer } from '../billing/quota.enforcer';
import { CashFoundationService } from '../cash-foundation/cash-foundation.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { JwtService } from '@nestjs/jwt';
import {
  createMockPrisma,
  createMockCache,
  createMockAudit,
  createMockCashFoundation,
  createMockRealtime,
  createMockJwtService,
} from './mocks';

// ── QuotaEnforcer mock ────────────────────────────────────────────────────────

export function createMockQuota() {
  return { checkOrThrow: jest.fn().mockResolvedValue({ allowed: true, current: 1, limit: 10, resource: 'test' }) };
}

// ── Service test builder ──────────────────────────────────────────────────────

export interface ServiceTestOptions {
  /** Incluir mock de CacheService */
  cache?: boolean;
  /** Incluir mock de AuditService */
  audit?: boolean;
  /** Incluir mock de QuotaEnforcer */
  quota?: boolean;
  /** Incluir mock de CashFoundationService */
  cashFoundation?: boolean;
  /** Incluir mock de RealtimeGateway */
  realtime?: boolean;
  /** Incluir mock de JwtService */
  jwt?: boolean;
  /** Providers adicionales (ej. mocks personalizados) */
  extra?: any[];
}

export interface ServiceTestResult<T> {
  /** Instancia del servicio bajo test */
  service: T;
  /** Mock de PrismaService */
  prisma: ReturnType<typeof createMockPrisma>;
  /** Mock de CacheService (si se incluyó) */
  cache?: ReturnType<typeof createMockCache>;
  /** Mock de AuditService (si se incluyó) */
  audit?: ReturnType<typeof createMockAudit>;
  /** Mock de QuotaEnforcer (si se incluyó) */
  quota?: ReturnType<typeof createMockQuota>;
  /** Mock de CashFoundationService (si se incluyó) */
  cash?: ReturnType<typeof createMockCashFoundation>;
  /** Mock de RealtimeGateway (si se incluyó) */
  realtime?: ReturnType<typeof createMockRealtime>;
  /** Mock de JwtService (si se incluyó) */
  jwt?: ReturnType<typeof createMockJwtService>;
}

/**
 * Crea un módulo NestJS de testing con los mocks indicados.
 * Retorna la instancia del servicio y todos los mocks creados.
 *
 * @example
 *   const { service, prisma, cache } = await buildServiceTest(CategoriesService, { cache: true });
 *   prisma.mockPrisma.category.findMany.mockResolvedValue([...]);
 *   const result = await service.list(user, context, filters);
 */
// ── Re-exported types for convenience in spec files ────────────────
// Uso: let prisma: MockPrisma;  (instead of ReturnType<typeof createMockPrisma>)

export type MockPrisma = ReturnType<typeof createMockPrisma>;
export type MockCache = ReturnType<typeof createMockCache>;
export type MockAudit = ReturnType<typeof createMockAudit>;
export type MockQuota = ReturnType<typeof createMockQuota>;
export type MockCash = ReturnType<typeof createMockCashFoundation>;
export type MockRealtime = ReturnType<typeof createMockRealtime>;
export type MockJwt = ReturnType<typeof createMockJwtService>;

// ── Service test builder ───────────────────────────────────────────

export async function buildServiceTest<T>(
  ServiceClass: new (...args: any[]) => T,
  options?: ServiceTestOptions,
): Promise<ServiceTestResult<T>> {
  const prisma = createMockPrisma();
  const providers: any[] = [
    ServiceClass,
    { provide: PrismaService, useValue: prisma.mockPrisma },
  ];

  const result: ServiceTestResult<T> = { service: undefined!, prisma };

  if (options?.cache) {
    const cache = createMockCache();
    providers.push({ provide: CacheService, useValue: cache });
    result.cache = cache;
  }

  if (options?.audit) {
    const audit = createMockAudit();
    providers.push({ provide: AuditService, useValue: audit });
    result.audit = audit;
  }

  if (options?.quota) {
    const quota = createMockQuota();
    providers.push({ provide: QuotaEnforcer, useValue: quota });
    result.quota = quota;
  }

  if (options?.cashFoundation) {
    const cash = createMockCashFoundation();
    providers.push({ provide: CashFoundationService, useValue: cash });
    result.cash = cash;
  }

  if (options?.realtime) {
    const realtime = createMockRealtime();
    providers.push({ provide: RealtimeGateway, useValue: realtime });
    result.realtime = realtime;
  }

  if (options?.jwt) {
    const jwt = createMockJwtService();
    providers.push({ provide: JwtService, useValue: jwt });
    result.jwt = jwt;
  }

  if (options?.extra) {
    providers.push(...options.extra);
  }

  const module: TestingModule = await Test.createTestingModule({ providers }).compile();
  result.service = module.get(ServiceClass);
  return result;
}
