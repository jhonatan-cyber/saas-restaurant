import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ScopeGuard } from './scope.guard';
import { HEADERS } from '@saas/shared';
import type { AuthenticatedUser, BusinessContext } from '../types/jwt-payload.type';
import type { Request } from 'express';

describe('ScopeGuard', () => {
  let guard: ScopeGuard;
  let mockRequest: Partial<Request & { user?: AuthenticatedUser; businessContext?: BusinessContext }>;

  function createContext(): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    guard = new ScopeGuard();
    mockRequest = {
      headers: {},
      user: {
        id: 'user-1',
        businessId: 'biz-1',
        branchIds: ['branch-1', 'branch-2'],
        userType: 'business',
      } as AuthenticatedUser,
    };
  });

  describe('canActivate', () => {
    it('returns true and sets businessContext from JWT when no headers', () => {
      const result = guard.canActivate(createContext());

      expect(result).toBe(true);
      expect(mockRequest.businessContext).toEqual({
        businessId: 'biz-1',
        branchId: null,
      });
    });

    it('uses x-business-id header when it matches JWT', () => {
      setHeader(HEADERS.BUSINESS_ID, 'biz-1');

      const result = guard.canActivate(createContext());

      expect(result).toBe(true);
      expect(mockRequest.businessContext!.businessId).toBe('biz-1');
    });

    it('throws ForbiddenException when x-business-id does not match JWT', () => {
      setHeader(HEADERS.BUSINESS_ID, 'biz-other');

      expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
    });

    it('resolves branchId from x-branch-id when in user.branchIds', () => {
      setHeader(HEADERS.BRANCH_ID, 'branch-1');

      guard.canActivate(createContext());

      expect(mockRequest.businessContext!.branchId).toBe('branch-1');
    });

    it('throws ForbiddenException when x-branch-id is not in user.branchIds', () => {
      setHeader(HEADERS.BRANCH_ID, 'branch-other');

      expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
    });

    it('allows any branchId when user.branchIds is empty', () => {
      mockRequest.user!.branchIds = [];
      setHeader(HEADERS.BRANCH_ID, 'any-branch');

      guard.canActivate(createContext());

      expect(mockRequest.businessContext!.branchId).toBe('any-branch');
    });

    it('sets branchId to null when x-branch-id is empty string', () => {
      setHeader(HEADERS.BRANCH_ID, '');

      guard.canActivate(createContext());

      expect(mockRequest.businessContext!.branchId).toBeNull();
    });

    it('resolves branchId from header even when user.branchIds has items', () => {
      setHeader(HEADERS.BRANCH_ID, 'branch-2');

      guard.canActivate(createContext());

      expect(mockRequest.businessContext!.branchId).toBe('branch-2');
    });

    it('throws ForbiddenException when no user in request', () => {
      mockRequest.user = undefined;

      expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
    });

    it('attaches businessContext to request', () => {
      setHeader(HEADERS.BRANCH_ID, 'branch-1');

      guard.canActivate(createContext());

      expect(mockRequest.businessContext).toBeDefined();
      expect(mockRequest.businessContext!.businessId).toBe('biz-1');
      expect(mockRequest.businessContext!.branchId).toBe('branch-1');
    });

    // ── Body branchId validation ─────────────────────────────────────

    it('validates branchId in body against user.branchIds on POST', () => {
      mockRequest.method = 'POST';
      mockRequest.body = { branchId: 'branch-1', name: 'test' };

      const result = guard.canActivate(createContext());

      expect(result).toBe(true);
    });

    it('throws ForbiddenException when body branchId is not in user.branchIds', () => {
      mockRequest.method = 'POST';
      mockRequest.body = { branchId: 'branch-unauthorized', name: 'test' };

      expect(() => guard.canActivate(createContext())).toThrow(ForbiddenException);
    });

    it('allows any body branchId when user.branchIds is empty', () => {
      mockRequest.user!.branchIds = [];
      mockRequest.method = 'POST';
      mockRequest.body = { branchId: 'any-branch', name: 'test' };

      const result = guard.canActivate(createContext());

      expect(result).toBe(true);
    });

    it('skips body validation on GET requests', () => {
      mockRequest.method = 'GET';
      mockRequest.body = { branchId: 'branch-unauthorized', name: 'test' };

      const result = guard.canActivate(createContext());

      expect(result).toBe(true);
    });

    it('skips body validation when body has no branchId', () => {
      mockRequest.method = 'POST';
      mockRequest.body = { name: 'test' };

      const result = guard.canActivate(createContext());

      expect(result).toBe(true);
    });

    it('allows body branchId even when header is empty (user wants all branches)', () => {
      setHeader(HEADERS.BRANCH_ID, '');
      mockRequest.method = 'POST';
      mockRequest.body = { branchId: 'branch-1', name: 'test' };

      const result = guard.canActivate(createContext());

      expect(result).toBe(true);
    });
  });

  function setHeader(name: string, value: string) {
    mockRequest.headers![name.toLowerCase()] = value;
  }
});
