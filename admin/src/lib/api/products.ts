import { type ProductDTO, type ProductListItemDTO, type ComboItemDTO, type CategoryDTO, type PreparationAreaDTO } from '@saas/shared';
import { api, type PaginatedResponse } from './index';

/** Backward-compatible aliases */
export type Product = ProductDTO;
export type ProductListItem = ProductListItemDTO;

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
  comboItems?: Array<{ productId: string; productName: string; quantity: number }>;
  bulkPricing?: Array<{ minQty: number; unitPrice: number }>;
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
    return api<PaginatedResponse<ProductDTO>>(`/products${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  all: (filters: { categoryId?: string; isAvailable?: boolean; page?: number; pageSize?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.categoryId) params.set('categoryId', filters.categoryId);
    if (filters.isAvailable !== undefined) params.set('isAvailable', String(filters.isAvailable));
    if (filters.page) params.set('page', String(filters.page));
    if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
    const qs = params.toString();
    return api<PaginatedResponse<ProductListItemDTO>>(`/products/all${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  lowStock: () => api<ProductListItemDTO[]>('/products/low-stock', { method: 'GET' }),

  get: (id: string) => api<ProductDTO>(`/products/${id}`, { method: 'GET' }),

  create: (data: CreateProductInput) =>
    api<ProductDTO>('/products', { method: 'POST', body: data }),

  update: (id: string, data: UpdateProductInput) =>
    api<ProductDTO>(`/products/${id}`, { method: 'PATCH', body: data }),

  remove: (id: string) => api<void>(`/products/${id}`, { method: 'DELETE' }),
};
