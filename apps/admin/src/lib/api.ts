import { useAuthStore } from './auth-store';
import { STORAGE_KEYS, type AuthenticatedUserDTO, HEADERS, type OrderStatus, type OrderType } from '@saas/shared';
import { apiRequest as axiosRequest, ApiClientError as AxiosApiClientError } from './axios-client';

const isBrowser = typeof window !== 'undefined';

const API_BASE_URL = isBrowser
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3001/api')
  : (process.env.API_INTERNAL_URL || import.meta.env.VITE_API_URL || 'http://api:3001/api');

const API_ROOT_URL = isBrowser
  ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001')
  : (process.env.API_INTERNAL_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://api:3001');

/**
 * Error tipado de la API.
 * Incluye el status code y el body parseado para que la UI pueda mostrar
 * mensajes específicos sin reinventar el parseo en cada call site.
 */
export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly body: ApiErrorBody;

  constructor(statusCode: number, body: ApiErrorBody) {
    super(formatErrorMessage(body));
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.body = body;
  }
}

export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

function formatErrorMessage(body: ApiErrorBody): string {
  if (typeof body.message === 'string') return body.message;
  if (Array.isArray(body.message) && body.message.length > 0) return body.message.join(', ');
  return body.error || 'Error desconocido';
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  /** Headers extra opcionales (x-branch-id, etc.) */
  extraHeaders?: Record<string, string>;
  /** Si es true, no agrega Authorization (útil para endpoints públicos) */
  skipAuth?: boolean;
  /** Si se pasa, agrega `x-branch-id`. Si es null, NO agrega. */
  branchId?: string | null;
}

/**
 * Cliente HTTP base.
 *  - Ahora usa axios internamente (via axios-client.ts) con interceptores
 *    de refresh automático y manejo de errores.
 *  - Mantiene la misma firma y los mismos tipos de error (ApiClientError)
 *    para compatibilidad con todas las pantallas existentes.
 *  - Centraliza Authorization, headers de tenant y manejo de errores.
 */
/**
 * Cliente HTTP base.
 *  - Ahora usa axios internamente (via axios-client.ts) con interceptores
 *    de refresh automático y manejo de errores.
 *  - Mantiene la misma firma y los mismos tipos de error (ApiClientError)
 *    para compatibilidad con todas las pantallas existentes.
 *
 * NOTA: `extraHeaders` se incluye aquí por compatibilidad con código
 * existente, pero los interceptores de axios ya manejan auth y tenant
 * headers de forma automática. Para headers ad-hoc, se puede pasar
 * `headers` directamente o usar `axiosRequest` de axios-client.ts.
 */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, extraHeaders, headers, skipAuth, branchId, ...rest } = options;

  try {
    return await axiosRequest<T>(path, {
      method: options.method ?? rest.method,
      body,
      skipAuth,
      branchId: branchId ?? undefined,
      // Merge extraHeaders y headers para compatibilidad
      headers: {
        ...(extraHeaders as Record<string, string> | undefined),
        ...(headers as Record<string, string> | undefined),
      },
    });
  } catch (error: unknown) {
    // Convertir AxiosApiClientError a ApiClientError (compatibilidad)
    if (error instanceof AxiosApiClientError) {
      const normalized: ApiErrorBody = {
        statusCode: error.statusCode,
        error: 'Error',
        message: error.message,
        path: path,
        timestamp: new Date().toISOString(),
      };
      throw new ApiClientError(error.statusCode, normalized);
    }
    throw error;
  }
}

// ============== API tipada de auth ==============

export interface LoginRequest {
  email: string;
  password: string;
  businessSlug: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUserDTO;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export const authApi = {
  login: (data: LoginRequest) =>
    api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: data,
      skipAuth: true,
    }),

  stationLogin: (businessSig: string) =>
    api<LoginResponse>('/pos-stations/station-login', {
      method: 'POST',
      body: { businessSig },
      skipAuth: true,
    }),

  refresh: (refreshToken: string) =>
    api<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      skipAuth: true,
      extraHeaders: { Authorization: `Bearer ${refreshToken}` },
    }),

  me: () => api<AuthenticatedUserDTO>('/auth/me', { method: 'GET' }),
};

// ============== Tipos compartidos Phase 2 ==============
// Mantenemos los tipos de paginación acá para no arrastrar el paquete
// @saas/shared en cada import (re-exportamos los necesarios desde arriba).

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ============== API: Categories ==============

export interface Category {
  id: string;
  businessId: string;
  branchId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListItem {
  id: string;
  name: string;
  slug: string;
  branchId: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface CategoryFilters {
  isActive?: boolean;
  branchId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  branchId?: string;
  isActive?: boolean;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export const categoriesApi = {
  list: (filters: CategoryFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<Category>>(`/categories${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  all: (filters: { isActive?: boolean; branchId?: string; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<CategoryListItem>>(`/categories/all${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  get: (id: string) => api<Category>(`/categories/${id}`, { method: 'GET' }),

  create: (data: CreateCategoryInput) =>
    api<Category>('/categories', { method: 'POST', body: data }),

  update: (id: string, data: UpdateCategoryInput) =>
    api<Category>(`/categories/${id}`, { method: 'PATCH', body: data }),

  reorder: (items: { id: string; displayOrder: number }[]) =>
    api<void>('/categories/reorder', { method: 'PATCH', body: { items } }),

  remove: (id: string) => api<void>(`/categories/${id}`, { method: 'DELETE' }),
};

// ============== API: Branches ==============

export interface Branch {
  id: string;
  businessId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  isMain: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  categoriesCount: number;
  productsCount: number;
  tablesCount: number;
  activeOrdersCount: number;
  openCashRegistersCount: number;
  openShiftsCount: number;
  activePosStationsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BranchListItem {
  id: string;
  name: string;
  code: string;
  isMain: boolean;
  status: string;
}

export interface BranchFilters {
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateBranchInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  isMain?: boolean;
}

export type UpdateBranchInput = Partial<CreateBranchInput> & { status?: 'ACTIVE' | 'INACTIVE' };

export const branchesApi = {
  list: (filters: BranchFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<Branch>>(`/branches${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  all: (filters: { isActive?: boolean; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<BranchListItem>>(`/branches/all${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  get: (id: string) => api<Branch>(`/branches/${id}`, { method: 'GET' }),

  create: (data: CreateBranchInput) =>
    api<Branch>('/branches', { method: 'POST', body: data }),

  update: (id: string, data: UpdateBranchInput) =>
    api<Branch>(`/branches/${id}`, { method: 'PATCH', body: data }),

  remove: (id: string) => api<void>(`/branches/${id}`, { method: 'DELETE' }),

  reactivate: (id: string) => api<void>(`/branches/${id}/reactivate`, { method: 'POST' }),
};

// ============== API: Purchases ==============

export interface PurchaseListItem {
  id: string;
  purchaseNumber: string;
  supplierName: string | null;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  total: string;
  itemCount: number;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string | null;
  productName: string;
  unitCost: string;
  quantity: string;
  lineTotal: string;
  createdAt: string;
}

export interface Purchase {
  id: string;
  businessId: string;
  branchId: string;
  supplierId: string | null;
  purchaseNumber: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  subtotal: string;
  taxTotal: string;
  total: string;
  notes: string | null;
  receivedAt: string | null;
  receivedBy: string | null;
  invoiceUrl: string | null;
  createdById: string;
  supplier: Supplier | null;
  items: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseFilters {
  branchId?: string;
  supplierId?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePurchaseInput {
  branchId: string;
  supplierId?: string;
  purchaseNumber: string;
  notes?: string;
  taxTotal?: number;
  items: { productId: string; quantity: number; unitCost: number }[];
}

export const purchasesApi = {
  list: (filters: PurchaseFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.supplierId) params.set('supplierId', filters.supplierId);
    if (filters.status) params.set('status', filters.status);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<PurchaseListItem>>(`/purchases${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  get: (id: string) => api<Purchase>(`/purchases/${id}`, { method: 'GET' }),

  create: (data: CreatePurchaseInput) =>
    api<Purchase>('/purchases', { method: 'POST', body: data }),

  update: (id: string, data: { purchaseNumber?: string; notes?: string | null }) =>
    api<Purchase>(`/purchases/${id}`, { method: 'PATCH', body: data }),

  complete: (id: string, receivedAt?: string) =>
    api<Purchase>(`/purchases/${id}/complete`, { method: 'POST', body: receivedAt ? { receivedAt } : {} }),

  cancel: (id: string) =>
    api<Purchase>(`/purchases/${id}/cancel`, { method: 'POST' }),
};

// ============== API: Inventory ==============

export interface InventoryMovement {
  id: string;
  businessId: string;
  branchId: string;
  productId: string;
  productName?: string;
  type: 'IN' | 'OUT' | 'INITIAL';
  referenceType: string;
  referenceId: string | null;
  quantity: string;
  unitCost: string | null;
  totalCost: string | null;
  runningBalance: string;
  notes: string | null;
  createdAt: string;
}

export interface InventoryKardex {
  productId: string;
  productName: string;
  sku: string | null;
  currentStock: string;
  movements: InventoryMovement[];
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string | null;
  currentStock: string;
  minStock: number | null;
}

export interface InventoryFilters {
  productId?: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
}

export const inventoryApi = {
  listMovements: (filters: InventoryFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.productId) params.set('productId', filters.productId);
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<InventoryMovement>>(`/inventory/movements${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  getKardex: (productId: string, branchId?: string) => {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    const qs = params.toString();
    return api<InventoryKardex>(`/inventory/kardex/${productId}${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  getLowStock: (branchId?: string) => {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    const qs = params.toString();
    return api<LowStockProduct[]>(`/inventory/low-stock${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
};

// ============== API: Reports ==============

export const ReportType = {
  SALES_DAILY: 'SALES_DAILY',
  SALES_RANGE: 'SALES_RANGE',
  PAYMENT_METHODS: 'PAYMENT_METHODS',
  TOP_PRODUCTS: 'TOP_PRODUCTS',
  GROSS_PROFIT: 'GROSS_PROFIT',
  INVENTORY: 'INVENTORY',
  CLOSE_REPORT: 'CLOSE_REPORT',
} as const;
export type ReportType = (typeof ReportType)[keyof typeof ReportType];

export const ReportFormat = {
  PDF: 'PDF',
  XLSX: 'XLSX',
} as const;
export type ReportFormat = (typeof ReportFormat)[keyof typeof ReportFormat];

export const ReportStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

export interface Report {
  id: string;
  businessId: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  params: Record<string, unknown>;
  resultUrl: string | null;
  resultSize: number | null;
  errorMessage: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportFilters {
  status?: ReportStatus;
  type?: ReportType;
  page?: number;
  pageSize?: number;
}

export const reportsApi = {
  list: (filters: ReportFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.type) params.set('type', filters.type);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<Report>>(`/reports${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  getById: (id: string) => api<Report>(`/reports/${id}`, { method: 'GET' }),

  request: (dto: { type: ReportType; format?: ReportFormat; params?: Record<string, unknown> }) =>
    api<Report>('/reports', { method: 'POST', body: dto }),
};

// ============== API: Suppliers ==============

export interface Supplier {
  id: string;
  businessId: string;
  branchId: string | null;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxId: string | null;
  notes: string | null;
  isActive: boolean;
  purchaseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierListItem {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface SupplierFilters {
  isActive?: boolean;
  search?: string;
  branchId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateSupplierInput {
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  notes?: string;
  isActive?: boolean;
  branchId?: string;
}

export type UpdateSupplierInput = Partial<CreateSupplierInput>;

export const suppliersApi = {
  list: (filters: SupplierFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.search) params.set('search', filters.search);
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<Supplier>>(`/suppliers${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  all: (filters: { isActive?: boolean; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<SupplierListItem>>(`/suppliers/all${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  get: (id: string) => api<Supplier>(`/suppliers/${id}`, { method: 'GET' }),

  create: (data: CreateSupplierInput) =>
    api<Supplier>('/suppliers', { method: 'POST', body: data }),

  update: (id: string, data: UpdateSupplierInput) =>
    api<Supplier>(`/suppliers/${id}`, { method: 'PATCH', body: data }),

  remove: (id: string) => api<void>(`/suppliers/${id}`, { method: 'DELETE' }),
};

// ============== API: Products ==============

export interface Product {
  id: string;
  businessId: string;
  branchId: string | null;
  categoryId: string | null;
  preparationAreaId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sku: string | null;
  price: string;
  cost: string | null;
  taxRate: string | null;
  isActive: boolean;
  isAvailable: boolean;
  minStock: number | null;
  trackStock: boolean;
  productType: 'SALE' | 'COMBO' | 'ADDON' | 'SERVICE' | 'INGREDIENT';
  preparationTimeMin: number | null;
  category: Category | null;
  preparationArea: PreparationArea | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  categoryId: string | null;
  imageUrl: string | null;
  price: string;
  cost: string | null;
  productType: 'SALE' | 'COMBO' | 'ADDON' | 'SERVICE' | 'INGREDIENT';
  isAvailable: boolean;
}

export interface ProductFilters {
  categoryId?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  productType?: 'SALE' | 'COMBO' | 'ADDON' | 'SERVICE' | 'INGREDIENT';
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateProductInput {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  categoryId?: string;
  preparationAreaId?: string;
  branchId?: string;
  sku?: string;
  price: number;
  cost?: number;
  taxRate?: number;
  trackStock?: boolean;
  minStock?: number;
  productType?: 'SALE' | 'COMBO' | 'ADDON' | 'SERVICE' | 'INGREDIENT';
  preparationTimeMin?: number;
  isActive?: boolean;
  isAvailable?: boolean;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export const productsApi = {
  list: (filters: ProductFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.isAvailable !== undefined) params.set('isAvailable', String(filters.isAvailable));
    if (filters.productType) params.set('productType', filters.productType);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<Product>>(`/products${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  all: (filters: { categoryId?: string; isAvailable?: boolean; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.isAvailable !== undefined) params.set('isAvailable', String(filters.isAvailable));
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<ProductListItem>>(`/products/all${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  lowStock: () => api<ProductListItem[]>('/products/low-stock', { method: 'GET' }),

  get: (id: string) => api<Product>(`/products/${id}`, { method: 'GET' }),

  create: (data: CreateProductInput) =>
    api<Product>('/products', { method: 'POST', body: data }),

  update: (id: string, data: UpdateProductInput) =>
    api<Product>(`/products/${id}`, { method: 'PATCH', body: data }),

  remove: (id: string) => api<void>(`/products/${id}`, { method: 'DELETE' }),
};

// ============== API: Preparation Areas ==============

export interface PreparationArea {
  id: string;
  businessId: string;
  branchId: string | null;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PreparationAreaListItem {
  id: string;
  name: string;
  code: string;
  branchId: string | null;
  isActive: boolean;
  displayOrder: number;
}

export interface PreparationAreaFilters {
  isActive?: boolean;
  branchId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreatePreparationAreaInput {
  name: string;
  code: string;
  description?: string;
  branchId?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export type UpdatePreparationAreaInput = Partial<CreatePreparationAreaInput>;

export const preparationAreasApi = {
  list: (filters: PreparationAreaFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<PreparationArea>>(
      `/preparation-areas${qs ? `?${qs}` : ''}`,
      { method: 'GET' },
    );
  },

  all: (filters: { isActive?: boolean; branchId?: string; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<PreparationAreaListItem>>(`/preparation-areas/all${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  get: (id: string) => api<PreparationArea>(`/preparation-areas/${id}`, { method: 'GET' }),

  create: (data: CreatePreparationAreaInput) =>
    api<PreparationArea>('/preparation-areas', { method: 'POST', body: data }),

  update: (id: string, data: UpdatePreparationAreaInput) =>
    api<PreparationArea>(`/preparation-areas/${id}`, { method: 'PATCH', body: data }),

  reorder: (items: { id: string; displayOrder: number }[]) =>
    api<void>('/preparation-areas/reorder', { method: 'PATCH', body: { items } }),

  remove: (id: string) => api<void>(`/preparation-areas/${id}`, { method: 'DELETE' }),
};

// ============== API: Tables ==============

export interface RestaurantTable {
  id: string;
  businessId: string;
  branchId: string;
  number: string;
  capacity: number;
  location: 'INDOOR' | 'OUTDOOR' | 'BAR' | 'PATIO' | 'TERRACE' | 'OTHER';
  status: 'FREE' | 'OCCUPIED' | 'RESERVED';
  displayOrder: number;
  notes: string | null;
  posX: number | null;
  posY: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TableFilters {
  branchId?: string;
  status?: 'FREE' | 'OCCUPIED' | 'RESERVED';
  location?: 'INDOOR' | 'OUTDOOR' | 'BAR' | 'PATIO' | 'TERRACE' | 'OTHER';
  page?: number;
  pageSize?: number;
}

export interface CreateTableInput {
  branchId: string;
  number: string;
  capacity?: number;
  location?: 'INDOOR' | 'OUTDOOR' | 'BAR' | 'PATIO' | 'TERRACE' | 'OTHER';
  displayOrder?: number;
  notes?: string;
  posX?: number;
  posY?: number;
}

export type UpdateTableInput = Omit<Partial<CreateTableInput>, 'branchId'>;

export const tablesApi = {
  list: (filters: TableFilters = {}, branchId?: string) => {
    const params = new URLSearchParams();
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.status) params.set('status', filters.status);
    if (filters.location) params.set('location', filters.location);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<RestaurantTable>>(`/tables${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...(branchId ? { branchId } : {}),
    });
  },

  all: (branchId?: string, page?: number, pageSize?: number) => {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    if (page) params.set('page', String(page));
    if (pageSize) params.set('pageSize', String(pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<RestaurantTable>>(`/tables/all${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...(branchId ? { branchId } : {}),
    });
  },

  get: (id: string) => api<RestaurantTable>(`/tables/${id}`, { method: 'GET' }),

  create: (data: CreateTableInput) =>
    api<RestaurantTable>('/tables', { method: 'POST', body: data }),

  update: (id: string, data: UpdateTableInput) =>
    api<RestaurantTable>(`/tables/${id}`, { method: 'PATCH', body: data }),

  changeStatus: (id: string, status: 'FREE' | 'OCCUPIED' | 'RESERVED', reason?: string) =>
    api<RestaurantTable>(`/tables/${id}/status`, {
      method: 'PATCH',
      body: { status, ...(reason ? { reason } : {}) },
    }),

  remove: (id: string) => api<void>(`/tables/${id}`, { method: 'DELETE' }),
};

// ============== API: Customers ==============

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  taxId: string | null;
  taxIdType: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  addressReference: string | null;
  latitude: string | null;
  longitude: string | null;
  notes: string | null;
  isActive: boolean;
  totalOrders: number;
  totalSpent: string;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFilters {
  isActive?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateCustomerInput {
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

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export const customersApi = {
  list: (filters: CustomerFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<Customer>>(`/customers${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  search: (q: string, limit = 20) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('limit', String(limit));
    return api<Customer[]>(`/customers/search?${params.toString()}`, { method: 'GET' });
  },

  get: (id: string) => api<Customer>(`/customers/${id}`, { method: 'GET' }),

  create: (data: CreateCustomerInput) =>
    api<Customer>('/customers', { method: 'POST', body: data }),

  update: (id: string, data: UpdateCustomerInput) =>
    api<Customer>(`/customers/${id}`, { method: 'PATCH', body: data }),

  remove: (id: string) => api<void>(`/customers/${id}`, { method: 'DELETE' }),
};

// ============== API: Orders ==============

/**
 * Item de una orden. El snapshot inmutable (R8) hace que productName,
 * unitPrice, taxRate, preparationAreaId y preparationAreaName NO cambien
 * aunque el Product original sea editado o eliminado. Por eso el frontend
 * NO envía unitPrice: el backend lo recalcula desde Product.
 */
export interface OrderItem {
  id: string;
  businessId: string;
  orderId: string;
  productId: string | null;
  productName: string;
  unitPrice: string;
  taxRate: string | null;
  preparationAreaId: string | null;
  preparationAreaName: string | null;
  quantity: number;
  notes: string | null;
  lineTotal: string;
  createdAt: string;
}

export interface OrderStateLog {
  id: string;
  businessId: string;
  orderId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Order {
  id: string;
  businessId: string;
  branchId: string;
  tableId: string | null;
  customerId: string | null;
  cashierId: string;
  waiterId: string | null;
  type: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  channel: 'POS_WEB' | 'POS_DESKTOP' | 'MOBILE' | 'KIOSK' | 'ADMIN';
  status:
    | 'DRAFT'
    | 'PENDING'
    | 'SENT_TO_KITCHEN'
    | 'IN_PREPARATION'
    | 'READY'
    | 'DELIVERED'
    | 'PAID'
    | 'CANCELLED';
  subtotal: string;
  taxTotal: string;
  total: string;
  globalNotes: string | null;
  cashRegisterId: string | null;
  shiftId: string | null;
  version: number;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  cancellationReason: string | null;
  items: OrderItem[];
  stateLogs?: OrderStateLog[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderListItem {
  id: string;
  businessId: string;
  branchId: string;
  tableId: string | null;
  type: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  status:
    | 'DRAFT'
    | 'PENDING'
    | 'SENT_TO_KITCHEN'
    | 'IN_PREPARATION'
    | 'READY'
    | 'DELIVERED'
    | 'PAID'
    | 'CANCELLED';
  total: string;
  itemCount: number;
  cashierId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Vista KDS. El backend agrupa por preparation area para evitar que el
 * cliente re-arme las columnas.
 */
export interface KdsOrder {
  id: string;
  tableId: string | null;
  tableNumber: string | null;
  status: OrderStatus;
  type: OrderType;
  globalNotes: string | null;
  total: string;
  itemCount: number;
  createdAt: string;
  elapsedSeconds: number;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    notes: string | null;
    preparationAreaId: string | null;
    preparationAreaName: string | null;
  }>;
}

export interface KdsAreaGroup {
  preparationAreaId: string;
  preparationAreaName: string;
  preparationAreaCode: string;
  orders: KdsOrder[];
}

export interface KdsView {
  branchId: string;
  generatedAt: string;
  areas: KdsAreaGroup[];
}

export interface OrderFilters {
  status?: string | string[];
  type?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  channel?: 'POS_WEB' | 'POS_DESKTOP' | 'MOBILE' | 'KIOSK' | 'ADMIN';
  tableId?: string;
  customerId?: string;
  cashierId?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface KdsFilters {
  branchId: string;
  preparationAreaId?: string;
  states?: string[];
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  notes?: string;
  /**
   * IGNORADO por el backend (recalcula desde Product). Existe por compat
   * con la Zod schema del backend pero el server-side es la única fuente
   * de verdad del precio (guardrail #3).
   */
  unitPrice?: number;
}

export interface CreateOrderInput {
  type?: 'DINE_IN' | 'TAKEOUT' | 'DELIVERY';
  channel?: 'POS_WEB' | 'POS_DESKTOP' | 'MOBILE' | 'KIOSK' | 'ADMIN';
  tableId?: string;
  customerId?: string;
  waiterId?: string;
  globalNotes?: string;
  items: CreateOrderItemInput[];
}

export interface UpdateOrderItemInput {
  quantity?: number;
  notes?: string | null;
}

export interface TransitionOrderInput {
  to: string;
  reason?: string;
  /** Para optimistic lock (R4): el cliente manda la versión que vio. */
  expectedVersion?: number;
}

export interface CancelOrderInput {
  reason: string;
  expectedVersion?: number;
}

export const ordersApi = {
  kds: (filters: KdsFilters) => {
    const params = new URLSearchParams();
    params.set('branchId', filters.branchId);
    if (filters.preparationAreaId) params.set('preparationAreaId', filters.preparationAreaId);
    if (filters.states?.length) params.set('states', filters.states.join(','));
    return api<KdsView>(`/orders/kds?${params.toString()}`, {
      method: 'GET',
      branchId: filters.branchId,
    });
  },

  list: (filters: OrderFilters = {}, branchId?: string) => {
    const params = new URLSearchParams();
    if (filters.status) {
      const arr = Array.isArray(filters.status) ? filters.status : [filters.status];
      arr.forEach((s) => params.append('status', s));
    }
    if (filters.type) params.set('type', filters.type);
    if (filters.channel) params.set('channel', filters.channel);
    if (filters.tableId) params.set('tableId', filters.tableId);
    if (filters.customerId) params.set('customerId', filters.customerId);
    if (filters.cashierId) params.set('cashierId', filters.cashierId);
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<OrderListItem>>(`/orders${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...(branchId ? { branchId } : {}),
    });
  },

  get: (id: string) => api<Order>(`/orders/${id}`, { method: 'GET' }),

  getLogs: (id: string) => api<OrderStateLog[]>(`/orders/${id}/logs`, { method: 'GET' }),

  create: (data: CreateOrderInput, branchId?: string) =>
    api<Order>('/orders', {
      method: 'POST',
      body: data,
      ...(branchId ? { branchId } : {}),
    }),

  addItem: (orderId: string, data: CreateOrderItemInput) =>
    api<Order>(`/orders/${orderId}/items`, { method: 'POST', body: data }),

  updateItem: (orderId: string, itemId: string, data: UpdateOrderItemInput) =>
    api<Order>(`/orders/${orderId}/items/${itemId}`, { method: 'PATCH', body: data }),

  removeItem: (orderId: string, itemId: string) =>
    api<Order>(`/orders/${orderId}/items/${itemId}`, { method: 'DELETE' }),

  transition: (orderId: string, data: TransitionOrderInput) =>
    api<Order>(`/orders/${orderId}/transition`, { method: 'POST', body: data }),

  cancel: (orderId: string, data: CancelOrderInput) =>
    api<Order>(`/orders/${orderId}/cancel`, { method: 'POST', body: data }),
};

// ============== Helpers de URL ==============

export const urls = {
  api: API_BASE_URL,
  apiRoot: API_ROOT_URL,
  storageKeys: STORAGE_KEYS,
};

// ============== API: Users (F7) ==============

import type { UserDTO, PaginatedResponseDTO, PaginationMetaDTO } from '@saas/shared';

export interface CreateUserData {
  email: string;
  fullName: string;
  password: string;
  role: string;
  phone?: string;
  defaultBranchId?: string;
}

export interface UpdateUserData {
  email?: string;
  fullName?: string;
  role?: string;
  phone?: string;
  defaultBranchId?: string | null;
}

export interface UserFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: string;
  status?: string;
}

export const usersApi = {
  create: (data: CreateUserData) =>
    api<UserDTO>('/users', { method: 'POST', body: data }),

  list: (filters: UserFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    if (filters.search) params.set('search', filters.search);
    if (filters.role) params.set('role', filters.role);
    if (filters.status) params.set('status', filters.status);
    const qs = params.toString();
    return api<PaginatedResponseDTO<UserDTO>>(`/users${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  getById: (id: string) =>
    api<UserDTO>(`/users/${id}`, { method: 'GET' }),

  update: (id: string, data: UpdateUserData) =>
    api<UserDTO>(`/users/${id}`, { method: 'PATCH', body: data }),

  remove: (id: string) =>
    api<{ id: string; status: string }>(`/users/${id}`, { method: 'DELETE' }),
};

// ============== API: Plans (F7) ==============

import type { PlanDTO } from '@saas/shared';

export interface CreatePlanData {
  code: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  billingPeriod: string;
  maxUsers: number;
  maxBranches: number;
  maxProducts: number;
  maxCategories: number;
  maxMonthlyOrders: number;
  maxStorageMb: number;
  features?: string[];
  isActive?: boolean;
  sortOrder?: number;
  isPublic?: boolean;
}

export type UpdatePlanData = Partial<CreatePlanData>;

export interface PlanFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}

export const plansApi = {
  create: (data: CreatePlanData) =>
    api<PlanDTO>('/plans', { method: 'POST', body: data }),

  list: (filters: PlanFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    if (filters.search) params.set('search', filters.search);
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    const qs = params.toString();
    return api<PaginatedResponseDTO<PlanDTO>>(`/plans${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  listPublic: () => api<PlanDTO[]>('/plans/public', { method: 'GET', skipAuth: true }),

  getById: (id: string) =>
    api<PlanDTO>(`/plans/${id}`, { method: 'GET' }),

  update: (id: string, data: UpdatePlanData) =>
    api<PlanDTO>(`/plans/${id}`, { method: 'PATCH', body: data }),

  remove: (id: string) =>
    api<{ id: string; isActive?: boolean; deleted?: boolean }>(`/plans/${id}`, { method: 'DELETE' }),
};

// ============== API: Subscription (F7) ==============

import type { SubscriptionDTO } from '@saas/shared';

export const subscriptionApi = {
  getCurrent: () =>
    api<SubscriptionDTO | null>('/subscription/current', { method: 'GET' }),

  assign: (planId: string) =>
    api<SubscriptionDTO>('/subscription/assign', { method: 'POST', body: { planId } }),

  cancel: () =>
    api<SubscriptionDTO>('/subscription/cancel', { method: 'POST' }),
};

// ============== API: Business (F7) ==============

import type { BusinessDTO } from '@saas/shared';

export interface UpdateBusinessData {
  name?: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  currency?: string;
  timezone?: string;
  moduleReports?: boolean;
  moduleInventory?: boolean;
  modulePosStations?: boolean;
  moduleDeliveryApp?: boolean;
}

export const businessApi = {
  getSettings: () => api<BusinessDTO>('/business/settings', { method: 'GET' }),

  updateSettings: (data: UpdateBusinessData) =>
    api<BusinessDTO>('/business/settings', { method: 'PATCH', body: data }),
};

// ============== API: Audit (F7) ==============

import type { AuditAction } from '@saas/shared';

export interface AuditLogEntry {
  id: string;
  createdAt: string;
  userId: string;
  entity: string;
  entityId: string;
  action: AuditAction;
  before: unknown;
  after: unknown;
  metadata: unknown;
}

export interface AuditFilters {
  page?: number;
  pageSize?: number;
  entity?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const auditApi = {
  list: (filters: AuditFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    if (filters.entity) params.set('entity', filters.entity);
    if (filters.entityId) params.set('entityId', filters.entityId);
    if (filters.action) params.set('action', filters.action);
    if (filters.userId) params.set('userId', filters.userId);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    const qs = params.toString();
    return api<{
      data: AuditLogEntry[];
      meta: { total: number; page: number; pageSize: number; totalPages: number };
    }>(`/audit${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },
};

// ============== API: Cash (F4) ==============

import type {
  CashRegisterDTO,
  OpenShiftInput,
  CloseShiftInput,
  ShiftDetailDTO,
  ArqueoDTO,
  CreateCashRegisterInput,
} from '@saas/shared';

export interface CashRegisterListItem {
  id: string;
  code: string;
  name: string;
  branchId: string;
  status: 'OPEN' | 'CLOSED';
  isPrimary: boolean;
}

export interface ShiftListItem {
  id: string;
  branchId: string;
  cashRegisterId: string;
  userId: string;
  status: 'OPEN' | 'CLOSED';
  openedAt: string;
  closedAt: string | null;
  openingAmount: string;
  closingAmount: string | null;
  difference: string | null;
}

export const cashApi = {
  listRegisters: (branchId?: string) => {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    const qs = params.toString();
    return api<CashRegisterListItem[]>(`/cash/registers${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...(branchId ? { branchId } : {}),
    });
  },

  createRegister: (data: CreateCashRegisterInput) =>
    api<CashRegisterDTO>('/cash/registers', { method: 'POST', body: data }),

  getCurrentShift: (branchId: string) =>
    api<ShiftDetailDTO | null>(`/cash/shifts/current?branchId=${branchId}`, {
      method: 'GET',
      branchId,
    }),

  openShift: (data: OpenShiftInput, branchId: string) =>
    api<ShiftDetailDTO>('/cash/shifts/open', { method: 'POST', body: data, branchId }),

  closeShift: (id: string, data: CloseShiftInput, branchId: string) =>
    api<ShiftDetailDTO>(`/cash/shifts/${id}/close`, {
      method: 'POST',
      body: data,
      branchId,
    }),

  getArqueo: (id: string, branchId: string) =>
    api<ArqueoDTO>(`/cash/shifts/${id}/arqueo`, { method: 'GET', branchId }),

  listShifts: (filters: { branchId?: string; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<ShiftListItem>>(`/cash/shifts${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    });
  },
};

// ============== API: Payments (F4) ==============

import type {
  PaymentMethod,
  CreatePaymentsInput,
  PayOrderResultDTO,
} from '@saas/shared';

export interface Payment {
  id: string;
  method: PaymentMethod;
  amount: string;
  tendered: string | null;
  change: string | null;
  reference: string | null;
  createdAt: string;
}

export const paymentsApi = {
  payOrder: (orderId: string, data: CreatePaymentsInput, branchId: string) =>
    api<PayOrderResultDTO>(`/payments/orders/${orderId}`, {
      method: 'POST',
      body: data,
      branchId,
    }),

  listForOrder: (orderId: string) =>
    api<Payment[]>(`/payments/orders/${orderId}`, { method: 'GET' }),

  previewChange: (data: { amount: number; tendered: number }, branchId: string) =>
    api<{ change: number; tendered: number; amount: number }>('/payments/preview-change', {
      method: 'POST',
      body: data,
      branchId,
    }),
};

// ============== API: Cash Movements (F4) ==============

import type {
  CashMovementDTO,
  CreateCashMovementInput,
  CashMovementSummaryDTO,
  CashMovementType as CashMovementTypeEnum,
} from '@saas/shared';

export interface CashMovementFilters {
  branchId?: string;
  shiftId?: string;
  type?: CashMovementTypeEnum;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export const cashMovementsApi = {
  create: (data: CreateCashMovementInput) =>
    api<CashMovementDTO>('/cash-movements', { method: 'POST', body: data }),

  list: (filters: CashMovementFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.shiftId) params.set('shiftId', filters.shiftId);
    if (filters.type) params.set('type', filters.type);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<CashMovementDTO>>(`/cash-movements${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      ...(filters.branchId ? { branchId: filters.branchId } : {}),
    });
  },

  getSummary: (filters: { branchId: string; shiftId?: string }) => {
    const params = new URLSearchParams();
    params.set('branchId', filters.branchId);
    if (filters.shiftId) params.set('shiftId', filters.shiftId);
    return api<CashMovementSummaryDTO>(
      `/cash-movements/summary?${params.toString()}`,
      { method: 'GET', branchId: filters.branchId },
    );
  },
};
