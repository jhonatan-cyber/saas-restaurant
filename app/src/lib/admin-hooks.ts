/**
 * Hooks reutilizables de TanStack Query para el Admin Panel.
 *
 * Sigue el mismo patrón que mobile/src/lib/hooks.ts:
 *  - Query keys centralizados
 *  - Hooks con staleTime configurado
 *  - Mutations con invalidación automática
 *
 * Los hooks reemplazan el uso de `useQuery` inline que se repite
 * en cada pantalla y centralizan la lógica de fetching.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from './axios-client';
import type {
  PaginatedResponseDTO,
  TableDTO,
  CategoryDTO,
  CategoryListItemDTO,
  ProductListItemDTO,
  UserDTO,
  PlanDTO,
  ShiftDetailDTO,
} from '@saas/shared';
import type {
  PaginatedResponse,
  Category,
  Product,
  Order,
  OrderListItem,
  OrderFilters,
  KdsView,
  KdsFilters,
  CreateOrderInput,
  TransitionOrderInput,
  CancelOrderInput,
  Branch,
  BranchListItem,
  Customer,
  CustomerFilters,
  Supplier,
  SupplierListItem,
  Purchase,
  PurchaseListItem,
  PreparationArea,
  InventoryMovement,
  AuditLogEntry,
  CashRegisterListItem,
  ShiftListItem,
  Payment,
  Report,
  ProductFilters,
  CategoryFilters,
  BranchFilters,
  SupplierFilters,
  PurchaseFilters,
  InventoryFilters,
  AuditFilters,
  ReportFilters,
  CreateProductInput,
  UpdateProductInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateBranchInput,
  UpdateBranchInput,
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateSupplierInput,
  UpdateSupplierInput,
  CreatePurchaseInput,
} from './api';
import {
  productsApi,
  categoriesApi,
  branchesApi,
  customersApi,
  suppliersApi,
  purchasesApi,
  ordersApi,
  tablesApi,
  cashApi,
  paymentsApi,
  cashMovementsApi,
  reportsApi,
  usersApi,
  plansApi,
  businessApi,
  auditApi,
  inventoryApi,
  preparationAreasApi,
  dashboardApi,
  type DashboardMetrics,
} from './api';

// ═════════════════════════════════════════════════════════════════════
//  QUERY KEYS
// ═════════════════════════════════════════════════════════════════════

export const queryKeys = {
  categories: {
    all: (filters?: CategoryFilters) => ['categories', 'list', filters] as const,
    list: (filters?: CategoryFilters) => ['categories', 'list', filters] as const,
    detail: (id: string) => ['categories', id] as const,
  },
  products: {
    list: (filters?: ProductFilters) => ['products', filters] as const,
    detail: (id: string) => ['products', id] as const,
  },
  branches: {
    list: (filters?: BranchFilters) => ['branches', filters] as const,
    detail: (id: string) => ['branches', id] as const,
  },
  customers: {
    list: (filters?: CustomerFilters) => ['customers', filters] as const,
    detail: (id: string) => ['customers', id] as const,
  },
  suppliers: {
    list: (filters?: SupplierFilters) => ['suppliers', filters] as const,
    detail: (id: string) => ['suppliers', id] as const,
  },
  purchases: {
    list: (filters?: PurchaseFilters) => ['purchases', filters] as const,
    detail: (id: string) => ['purchases', id] as const,
  },
  tables: {
    all: (branchId?: string) => ['tables', 'all', branchId] as const,
    list: (filters?: Record<string, unknown>) => ['tables', filters] as const,
    detail: (id: string) => ['tables', id] as const,
  },
  orders: {
    kds: (branchId: string) => ['orders', 'kds', branchId] as const,
    list: (filters?: OrderFilters) => ['orders', 'list', filters] as const,
    detail: (id: string) => ['orders', id] as const,
  },
  users: {
    list: (filters?: Record<string, unknown>) => ['users', filters] as const,
    detail: (id: string) => ['users', id] as const,
  },
  plans: {
    list: (filters?: Record<string, unknown>) => ['plans', filters] as const,
    detail: (id: string) => ['plans', id] as const,
  },
  cash: {
    registers: (branchId?: string) => ['cash', 'registers', branchId] as const,
    shifts: (filters?: Record<string, unknown>) => ['cash', 'shifts', filters] as const,
  },
  reports: {
    list: (filters?: ReportFilters) => ['reports', filters] as const,
    detail: (id: string) => ['reports', id] as const,
  },
  audit: {
    list: (filters?: AuditFilters) => ['audit', filters] as const,
  },
  preparationAreas: {
    list: (filters?: Record<string, unknown>) => ['preparation-areas', filters] as const,
    detail: (id: string) => ['preparation-areas', id] as const,
  },
  business: {
    settings: () => ['business', 'settings'] as const,
  },
  auth: {
    me: () => ['auth', 'me'] as const,
  },
};

// ═════════════════════════════════════════════════════════════════════
//  CATEGORY HOOKS
// ═════════════════════════════════════════════════════════════════════

export function useCategories(filters?: CategoryFilters) {
  return useQuery({
    queryKey: queryKeys.categories.list(filters),
    queryFn: () => categoriesApi.list(filters),
    staleTime: 30_000,
  });
}

export function useCategory(id: string) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id),
    queryFn: () => categoriesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCategoryInput) => categoriesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryInput }) =>
      categoriesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

// ═════════════════════════════════════════════════════════════════════
//  PRODUCT HOOKS
// ═════════════════════════════════════════════════════════════════════

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => productsApi.list(filters),
    staleTime: 30_000,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductInput) => productsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductInput }) =>
      productsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

// ═════════════════════════════════════════════════════════════════════
//  BRANCH HOOKS
// ═════════════════════════════════════════════════════════════════════

export function useBranches(filters?: BranchFilters) {
  return useQuery({
    queryKey: queryKeys.branches.list(filters),
    queryFn: () => branchesApi.list(filters),
    staleTime: 60_000,
  });
}

// ═════════════════════════════════════════════════════════════════════
//  ORDER HOOKS
// ═════════════════════════════════════════════════════════════════════

export function useOrdersList(filters?: OrderFilters) {
  return useQuery({
    queryKey: queryKeys.orders.list(filters),
    queryFn: () => ordersApi.list(filters),
    staleTime: 15_000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(id),
    queryFn: () => ordersApi.get(id),
    enabled: !!id,
  });
}

export function useKdsView(filters: KdsFilters) {
  return useQuery({
    queryKey: queryKeys.orders.kds(filters.branchId),
    queryFn: () => ordersApi.kds(filters),
    enabled: !!filters.branchId,
    refetchInterval: 30_000,
  });
}

/**
 * Mutation: transicionar orden con optimistic lock.
 * Sigue el patrón del mobile: expectedVersion es opcional.
 */
export function useTransitionOrder(branchId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { orderId: string; data: TransitionOrderInput }) =>
      ordersApi.transition(params.orderId, params.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { orderId: string; data: CancelOrderInput }) =>
      ordersApi.cancel(params.orderId, params.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

// ═════════════════════════════════════════════════════════════════════
//  TABLE HOOKS
// ═════════════════════════════════════════════════════════════════════

export function useTablesAll(branchId?: string) {
  return useQuery({
    queryKey: queryKeys.tables.all(branchId),
    queryFn: () => tablesApi.all(branchId),
    select: (res) => res.data,
    enabled: !!branchId,
    staleTime: 30_000,
  });
}

// ═════════════════════════════════════════════════════════════════════
//  CUSTOMER HOOKS
// ═════════════════════════════════════════════════════════════════════

export function useCustomers(filters?: CustomerFilters) {
  return useQuery({
    queryKey: queryKeys.customers.list(filters),
    queryFn: () => customersApi.list(filters),
    staleTime: 30_000,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomerInput) => customersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}

// ═════════════════════════════════════════════════════════════════════
//  SUPPLIER HOOKS
// ═════════════════════════════════════════════════════════════════════

export function useSuppliers(filters?: SupplierFilters) {
  return useQuery({
    queryKey: queryKeys.suppliers.list(filters),
    queryFn: () => suppliersApi.list(filters),
    staleTime: 30_000,
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSupplierInput) => suppliersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

// ═════════════════════════════════════════════════════════════════════
//  PURCHASE HOOKS
// ═════════════════════════════════════════════════════════════════════

export function usePurchases(filters?: PurchaseFilters) {
  return useQuery({
    queryKey: queryKeys.purchases.list(filters),
    queryFn: () => purchasesApi.list(filters),
    staleTime: 15_000,
  });
}

export function usePurchase(id: string) {
  return useQuery({
    queryKey: queryKeys.purchases.detail(id),
    queryFn: () => purchasesApi.get(id),
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePurchaseInput) => purchasesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchases'] }),
  });
}

// ═════════════════════════════════════════════════════════════════════
//  PREPARATION AREA HOOKS
// ═════════════════════════════════════════════════════════════════════

export function usePreparationAreas(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: queryKeys.preparationAreas.list(filters),
    queryFn: () => preparationAreasApi.list(filters as any),
    staleTime: 30_000,
  });
}

// ═════════════════════════════════════════════════════════════════════
//  DASHBOARD METRICS HOOK
// ═════════════════════════════════════════════════════════════════════

export function useDashboardMetrics(branchId?: string) {
  return useQuery({
    queryKey: ['dashboard', 'metrics', branchId] as const,
    queryFn: () => dashboardApi.metrics(branchId),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
