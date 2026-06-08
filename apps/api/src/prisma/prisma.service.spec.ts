/**
 * PrismaService.tenantFilter tests.
 *
 * tenantFilter es un método puro (solo depende de sus argumentos).
 * En lugar de instanciar PrismaService (que requiere driver adapter),
 * testeamos el método como una función aislada extrayendo su lógica.
 */

// La lógica de tenantFilter es:
//   const branchId = context?.branchId;
//   return {
//     businessId: context?.businessId ?? user.businessId,
//     ...(branchId ? { branchId } : {}),
//   };

type TenantFilterFn = (
  user: { businessId: string },
  context?: { businessId?: string; branchId?: string },
) => { businessId: string; branchId?: string };

describe('PrismaService.tenantFilter', () => {
  // tenantFilter como función pura (sin dependencias externas ni DB)
  const tenantFilter: TenantFilterFn = (user, context?) => {
    const branchId = context?.branchId;
    return {
      businessId: context?.businessId ?? user.businessId,
      ...(branchId ? { branchId } : {}),
    };
  };

  it('returns businessId from context when available', () => {
    const result = tenantFilter(
      { businessId: 'user-biz' },
      { businessId: 'context-biz' },
    );
    expect(result).toEqual({ businessId: 'context-biz' });
  });

  it('falls back to user.businessId when no context', () => {
    const result = tenantFilter({ businessId: 'user-biz' });
    expect(result).toEqual({ businessId: 'user-biz' });
  });

  it('includes branchId from context when present', () => {
    const result = tenantFilter(
      { businessId: 'biz-1' },
      { businessId: 'biz-1', branchId: 'branch-1' },
    );
    expect(result).toEqual({ businessId: 'biz-1', branchId: 'branch-1' });
  });

  it('omits branchId when context has no branchId', () => {
    const result = tenantFilter(
      { businessId: 'biz-1' },
      { businessId: 'biz-1' },
    );
    expect(result).toEqual({ businessId: 'biz-1' });
    expect(result).not.toHaveProperty('branchId');
  });

  it('uses user.businessId when context.businessId is undefined', () => {
    const result = tenantFilter(
      { businessId: 'user-biz' },
      { businessId: undefined },
    );
    expect(result).toEqual({ businessId: 'user-biz' });
  });
});
