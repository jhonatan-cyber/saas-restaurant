/**
 * Shared helpers for controller unit tests.
 *
 * Elimina la duplicación de ~30 líneas por archivo de controller spec:
 *   - mockUser / mockCtx / mockRes / mockReq idénticos en cada archivo
 *   - overrideGuard(JwtAuthGuard|ScopeGuard|RolesGuard) repetido
 *   - Test.createTestingModule + .compile() boilerplate
 *
 * Uso típico (catálogo con 3 guards):
 *   const ctrl = await buildControllerTest(MyController, [
 *     { provide: MyService, useValue: serviceMock },
 *   ]);
 *
 * Uso sin ScopeGuard (ej. Cash, Plans):
 *   const ctrl = await buildControllerTest(CashController, [...], { skipScopeGuard: true });
 *
 * Uso sin RolesGuard (ej. Inventory, Subscription.getCurrent):
 *   const ctrl = await buildControllerTest(InventoryController, [...], { skipRolesGuard: true });
 */
import { Test } from '@nestjs/testing';
import type { TestingModuleBuilder } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScopeGuard } from '../auth/guards/scope.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { Response } from 'express';
import { createTestUser, createTestContext } from './mocks';
export { createTestUser, createTestContext } from './mocks';
import type { AuthenticatedUser, BusinessContext } from '../auth/types/jwt-payload.type';

// ── Shared test data (generated from mocks factories) ────────────────────────

export const mockUser = createTestUser();
export const mockCtx = createTestContext();

// ── Shared mock factories ─────────────────────────────────────────────────────

export function mockRes(): Response {
  return {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;
}

export function mockReq(user: AuthenticatedUser = mockUser): any {
  return { user } as any;
}

// ── Module builder ────────────────────────────────────────────────────────────

export interface BuildControllerOptions {
  /** Saltar RolesGuard (ej. InventoryController solo usa JwtAuth + Scope) */
  skipRolesGuard?: boolean;
  /** Saltar ScopeGuard (ej. CashController solo usa JwtAuth + Roles) */
  skipScopeGuard?: boolean;
  /** Saltar JwtAuthGuard (ej. endpoint público en PlansController) */
  skipJwtGuard?: boolean;
}

/**
 * Crea un módulo NestJS de testing para un controlador.
 * Por defecto sobreescribe JwtAuthGuard, ScopeGuard y RolesGuard con
 * implementaciones que siempre permiten el acceso.
 *
 * Retorna la instancia del controlador listo para testear.
 *
 * @example
 *   const ctrl = await buildControllerTest(CategoriesController, [
 *     { provide: CategoriesService, useValue: serviceMock },
 *   ]);
 *   const result = await ctrl.list(mockUser, mockCtx, filters);
 */
export async function buildControllerTest<T>(
  controller: new (...args: any[]) => T,
  providers: any[],
  options?: BuildControllerOptions,
): Promise<T> {
  let builder = Test.createTestingModule({
    controllers: [controller],
    providers,
  });

  if (!options?.skipJwtGuard) {
    builder = builder.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true });
  }
  if (!options?.skipScopeGuard) {
    builder = builder.overrideGuard(ScopeGuard).useValue({ canActivate: () => true });
  }
  if (!options?.skipRolesGuard) {
    builder = builder.overrideGuard(RolesGuard).useValue({ canActivate: () => true });
  }

  const mod = await builder.compile();
  return mod.get(controller);
}
