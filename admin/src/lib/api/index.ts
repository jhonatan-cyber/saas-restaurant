/**
 * Cliente HTTP base y re-export de APIs por dominio.
 *
 * Este archivo reemplaza al anterior api.ts monolítico (~3000 líneas).
 * Cada dominio tiene su propio archivo en lib/api/.
 * Los tipos duplicados se importan desde @saas/shared.
 *
 * USO: import { api, ApiClientError, authApi, categoriesApi, ... } from '~/lib/api';
 *      import { authApi } from '~/lib/api';
 *      import { ApiClientError } from '~/lib/api';
 */
import { STORAGE_KEYS, HEADERS } from '@saas/shared';
import { apiRequest as axiosRequest, ApiClientError as AxiosApiClientError } from '../axios-client';

const isBrowser = typeof window !== 'undefined';

const API_BASE_URL = isBrowser
  ? (import.meta.env.VITE_API_URL || 'http://localhost:3001/api')
  : (process.env.API_INTERNAL_URL || import.meta.env.VITE_API_URL || 'http://api:3001/api');

const API_ROOT_URL = isBrowser
  ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001')
  : (process.env.API_INTERNAL_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://api:3001');

// ═════════════════════════════════════════════════════════════════════
//  ApiClientError — error tipado de la API
// ═════════════════════════════════════════════════════════════════════

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

// ═════════════════════════════════════════════════════════════════════
//  ApiOptions — interfaz de opciones para api()
// ═════════════════════════════════════════════════════════════════════

export interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  extraHeaders?: Record<string, string>;
  skipAuth?: boolean;
  branchId?: string | null;
}

// ═════════════════════════════════════════════════════════════════════
//  api() — función base para todas las requests
// ═════════════════════════════════════════════════════════════════════

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, extraHeaders, headers, skipAuth, branchId, ...rest } = options;

  try {
    return await axiosRequest<T>(path, {
      method: options.method ?? rest.method,
      body,
      skipAuth,
      branchId: branchId ?? undefined,
      headers: {
        ...(extraHeaders as Record<string, string> | undefined),
        ...(headers as Record<string, string> | undefined),
      },
    });
  } catch (error: unknown) {
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

// ═════════════════════════════════════════════════════════════════════
//  PaginatedResponse — tipo genérico para endpoints paginados
// ═════════════════════════════════════════════════════════════════════

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ═════════════════════════════════════════════════════════════════════
//  urls — helpers de URL
// ═════════════════════════════════════════════════════════════════════

export const urls = {
  api: API_BASE_URL,
  apiRoot: API_ROOT_URL,
  storageKeys: STORAGE_KEYS,
};

// ═════════════════════════════════════════════════════════════════════
//  Re-export de APIs por dominio + todos los tipos usados por consumers
// ═════════════════════════════════════════════════════════════════════

export { authApi, type LoginRequest, type LoginResponse, type RefreshResponse } from './auth';
export {
  categoriesApi,
  type Category,
  type CategoryFilters,
  type CreateCategoryInput,
  type UpdateCategoryInput,
} from './categories';
export {
  branchesApi,
  type Branch,
  type BranchListItem,
  type BranchFilters,
  type CreateBranchInput,
  type UpdateBranchInput,
} from './branches';
export {
  productsApi,
  type Product,
  type ProductListItem,
  type ProductFilters,
  type CreateProductInput,
  type UpdateProductInput,
} from './products';
export {
  preparationAreasApi,
  type PreparationArea,
  type PreparationAreaFilters,
  type CreatePreparationAreaInput,
  type UpdatePreparationAreaInput,
} from './preparation-areas';
export {
  tablesApi,
  type RestaurantTable,
  type TableFilters,
  type CreateTableInput,
  type UpdateTableInput,
} from './tables';
export {
  customersApi,
  type Customer,
  type CustomerFilters,
  type CreateCustomerInput,
  type UpdateCustomerInput,
} from './customers';
export {
  ordersApi,
  type KdsOrder,
  type KdsAreaGroup,
  type KdsView,
  type OrderFilters,
  type KdsFilters,
  type Order,
  type OrderItem,
  type OrderStateLog,
  type OrderListItem,
  type CreateOrderInput,
  type CreateOrderItemInput,
  type UpdateOrderItemInput,
  type TransitionOrderInput,
  type CancelOrderInput,
} from './orders';
export {
  cashApi,
  type CashRegisterListItem,
  type ShiftListItem,
} from './cash';
export {
  paymentsApi,
  type Payment,
} from './payments';
export {
  cashMovementsApi,
  type CashMovementFilters,
} from './cash-movements';
export {
  suppliersApi,
  type Supplier,
  type SupplierListItem,
  type SupplierFilters,
  type CreateSupplierInput,
  type UpdateSupplierInput,
} from './suppliers';
export {
  purchasesApi,
  type Purchase,
  type PurchaseItem,
  type PurchaseListItem,
  type PurchaseFilters,
  type CreatePurchaseInput,
} from './purchases';
export {
  inventoryApi,
  type InventoryMovement,
  type InventoryFilters,
} from './inventory';
export {
  reportsApi,
  ReportType,
  ReportFormat,
  ReportStatus,
  type Report,
  type ReportFilters,
} from './reports';
export {
  usersApi,
  type UserFilters,
} from './users';
export {
  plansApi,
  type PlanFilters,
} from './plans';
export {
  businessApi,
  subscriptionApi,
  type UpdateBusinessData,
} from './business';
export {
  auditApi,
  type AuditFilters,
  type AuditLogEntry,
} from './audit';
