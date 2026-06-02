import { useAuthStore } from './auth-store';
import { STORAGE_KEYS, type AuthenticatedUserDTO, HEADERS } from '@saas/shared';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const API_ROOT_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Headers extra opcionales (x-branch-id, etc.) */
  extraHeaders?: Record<string, string>;
  /** Si es true, no agrega Authorization (útil para endpoints públicos) */
  skipAuth?: boolean;
  /** Si se pasa, agrega `x-branch-id`. Si es null, NO agrega. */
  branchId?: string | null;
}

/**
 * Cliente HTTP base.
 *  - Centraliza Authorization, headers de tenant y manejo de errores.
 *  - Lee el token y el user de Zustand (no de localStorage) para reactividad.
 *  - Parsea el body de error al formato uniforme del HttpExceptionFilter.
 */
export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, extraHeaders, skipAuth, headers, branchId, ...rest } = options;

  const authHeaders: Record<string, string> = {};
  if (!skipAuth) {
    const state = useAuthStore.getState();
    if (state.token) authHeaders.Authorization = `Bearer ${state.token}`;
    if (state.user) authHeaders[HEADERS.BUSINESS_ID] = state.user.businessId;
    if (branchId !== undefined && branchId !== null) {
      authHeaders[HEADERS.BRANCH_ID] = branchId;
    }
  }

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...authHeaders,
    ...extraHeaders,
    ...(headers ? (headers as Record<string, string>) : {}),
  };

  const init: RequestInit = {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  const res = await fetch(`${API_BASE_URL}${path}`, init);

  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as Partial<ApiErrorBody>;
    const normalized: ApiErrorBody = {
      statusCode: errBody.statusCode ?? res.status,
      error: errBody.error ?? 'Error',
      message: errBody.message ?? res.statusText,
      path: errBody.path ?? path,
      timestamp: errBody.timestamp ?? new Date().toISOString(),
    };
    throw new ApiClientError(res.status, normalized);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
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

  all: (filters: { isActive?: boolean; branchId?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.branchId) params.set('branchId', filters.branchId);
    const qs = params.toString();
    return api<CategoryListItem[]>(`/categories/all${qs ? `?${qs}` : ''}`, { method: 'GET' });
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

  all: (filters: { categoryId?: string; isAvailable?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.isAvailable !== undefined) params.set('isAvailable', String(filters.isAvailable));
    const qs = params.toString();
    return api<ProductListItem[]>(`/products/all${qs ? `?${qs}` : ''}`, { method: 'GET' });
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

  all: (filters: { isActive?: boolean; branchId?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    if (filters.branchId) params.set('branchId', filters.branchId);
    const qs = params.toString();
    return api<PreparationAreaListItem[]>(`/preparation-areas/all${qs ? `?${qs}` : ''}`, {
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

  all: (branchId?: string) => {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    const qs = params.toString();
    return api<RestaurantTable[]>(`/tables/all${qs ? `?${qs}` : ''}`, {
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

// ============== Helpers de URL ==============

export const urls = {
  api: API_BASE_URL,
  apiRoot: API_ROOT_URL,
  storageKeys: STORAGE_KEYS,
};
