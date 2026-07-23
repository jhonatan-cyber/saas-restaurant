import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../types/jwt-payload.type';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let getAllAndOverrideSpy: jest.SpyInstance;

  function createContext(user: AuthenticatedUser | undefined): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
    getAllAndOverrideSpy = jest.spyOn(reflector, 'getAllAndOverride');
  });

  afterEach(() => {
    getAllAndOverrideSpy.mockRestore();
  });

  describe('canActivate', () => {
    const businessUser = { role: 'ADMIN', userType: 'business' } as AuthenticatedUser;

    it('returns true when no @Roles() is set', () => {
      getAllAndOverrideSpy.mockReturnValue(undefined);
      const context = createContext(businessUser);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('returns true when @Roles() has empty array', () => {
      getAllAndOverrideSpy.mockReturnValue([]);
      const context = createContext(businessUser);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('returns true when user role is in the required roles', () => {
      getAllAndOverrideSpy.mockReturnValue(['OWNER', 'ADMIN']);
      const context = createContext({ role: 'ADMIN', userType: 'business' } as AuthenticatedUser);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('throws ForbiddenException when user role is not in required roles', () => {
      getAllAndOverrideSpy.mockReturnValue(['OWNER', 'ADMIN']);
      const context = createContext({ role: 'MESERO', userType: 'business' } as AuthenticatedUser);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('includes required roles in the error message', () => {
      getAllAndOverrideSpy.mockReturnValue(['OWNER', 'ADMIN']);
      const context = createContext({ role: 'MESERO', userType: 'business' } as AuthenticatedUser);

      try {
        guard.canActivate(context);
        fail('Should have thrown');
      } catch (e) {
        const err = e as ForbiddenException;
        expect(err.message).toContain('OWNER');
        expect(err.message).toContain('ADMIN');
      }
    });

    it('throws ForbiddenException when user is not authenticated (no user)', () => {
      getAllAndOverrideSpy.mockReturnValue(['ADMIN']);
      const context = createContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException with authentication message when no user', () => {
      getAllAndOverrideSpy.mockReturnValue(['ADMIN']);
      const context = createContext(undefined);

      try {
        guard.canActivate(context);
        fail('Should have thrown');
      } catch (e) {
        const err = e as ForbiddenException;
        expect(err.message).toContain('no autenticado');
      }
    });
  });
});
