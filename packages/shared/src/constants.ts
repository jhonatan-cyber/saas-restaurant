/**
 * Constantes globales del sistema.
 */

export const APP_NAME = 'SaaS Restaurant';
export const APP_VERSION = '0.1.0';

export const DEFAULT_CURRENCY = 'BOB';
export const DEFAULT_TIMEZONE = 'America/La_Paz';

/**
 * Cabeceras HTTP que el cliente debe enviar para establecer contexto multi-tenant.
 * El backend valida que coincidan con el JWT.
 */
export const HEADERS = {
  BUSINESS_ID: 'x-business-id',
  BRANCH_ID: 'x-branch-id',
  REQUEST_ID: 'x-request-id',
} as const;

/**
 * Claves de localStorage usadas por el frontend.
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'saas.auth.token',
  AUTH_REFRESH: 'saas.auth.refresh',
  AUTH_USER: 'saas.auth.user',
  ACTIVE_BRANCH: 'saas.active_branch',
} as const;

/**
 * TTL por defecto para tokens (en segundos). Coincide con JWT_ACCESS_TTL=15m.
 */
export const DEFAULT_ACCESS_TTL_SECONDS = 60 * 15;

/**
 * Paginación por defecto.
 *  - DEFAULT_PAGE_SIZE: tamaño por defecto cuando el cliente no lo envía.
 *  - MAX_PAGE_SIZE: tope absoluto (evita requests que pidan 10.000 items).
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Endpoints de la API.
 * Centralizados para evitar strings sueltos en el código del frontend.
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  CATEGORIES: {
    BASE: '/categories',
    ALL: '/categories/all',
    REORDER: '/categories/reorder',
  },
  PRODUCTS: {
    BASE: '/products',
    ALL: '/products/all',
    LOW_STOCK: '/products/low-stock',
  },
  PREPARATION_AREAS: {
    BASE: '/preparation-areas',
    ALL: '/preparation-areas/all',
    REORDER: '/preparation-areas/reorder',
  },
  TABLES: {
    BASE: '/tables',
    ALL: '/tables/all',
  },
  CUSTOMERS: {
    BASE: '/customers',
    SEARCH: '/customers/search',
  },
  ORDERS: {
    BASE: '/orders',
    KDS: '/orders/kds',
    BY_ID: (id: string) => `/orders/${id}`,
    ITEMS: (id: string) => `/orders/${id}/items`,
    ITEM_BY_ID: (id: string, itemId: string) => `/orders/${id}/items/${itemId}`,
    TRANSITION: (id: string) => `/orders/${id}/transition`,
    CANCEL: (id: string) => `/orders/${id}/cancel`,
    LOGS: (id: string) => `/orders/${id}/logs`,
  },
  // FASE 6: SaaS
  SAAS: {
    PLANS: '/saas/plans',
    PLAN_BY_ID: (id: string) => `/saas/plans/${id}`,
    SUBSCRIPTION: '/saas/subscription',
    CHECK_FEATURE: (feature: string) => `/saas/check/${feature}`,
  },
  // FASE 6: Inventario
  SUPPLIERS: {
    BASE: '/suppliers',
    ALL: '/suppliers/all',
    BY_ID: (id: string) => `/suppliers/${id}`,
  },
  PURCHASES: {
    BASE: '/purchases',
    BY_ID: (id: string) => `/purchases/${id}`,
    COMPLETE: (id: string) => `/purchases/${id}/complete`,
    CANCEL: (id: string) => `/purchases/${id}/cancel`,
  },
  INVENTORY: {
    MOVEMENTS: '/inventory/movements',
    KARDEX: (productId: string) => `/inventory/products/${productId}/kardex`,
    LOW_STOCK: '/inventory/low-stock',
    ADJUST: '/inventory/adjust',
  },
  // FASE 6: Reportes
  REPORTS: {
    BASE: '/reports',
    REQUEST: '/reports/request',
    BY_ID: (id: string) => `/reports/${id}`,
    DOWNLOAD: (id: string) => `/reports/${id}/download`,
  },
} as const;

/**
 * Códigos de error de dominio. Se exponen en `body.code` para que el
 * frontend pueda mapear a UX específica sin parsear mensajes.
 */
export const ERROR_CODES = {
  // Orders
  CASH_SESSION_REQUIRED: 'cashSessionRequired',
  ITEMS_REQUIRED: 'itemsRequired',
  ORDER_NOT_EDITABLE: 'orderNotEditable',
  TRANSITION_NOT_ALLOWED: 'transitionNotAllowed',
  CANCELLATION_REASON_REQUIRED: 'cancellationReasonRequired',
  STALE_VERSION: 'staleVersion',
  ORDER_NOT_FOUND: 'orderNotFound',
  INVALID_PRODUCT: 'invalidProduct',
  INVALID_TABLE: 'invalidTable',
  // Realtime
  UNAUTHORIZED: 'unauthorized',
  WS_RATE_LIMIT: 'wsRateLimit',
  // FASE 6: Inventario
  PRODUCT_NOT_FOUND: 'productNotFound',
  INSUFFICIENT_STOCK: 'insufficientStock',
  PURCHASE_NOT_FOUND: 'purchaseNotFound',
  SUPPLIER_NOT_FOUND: 'supplierNotFound',
  // FASE 6: Reportes
  REPORT_NOT_FOUND: 'reportNotFound',
  REPORT_PENDING: 'reportPending',
  REPORT_FAILED: 'reportFailed',
  // FASE 6: SaaS
  PLAN_NOT_FOUND: 'planNotFound',
  SUBSCRIPTION_REQUIRED: 'subscriptionRequired',
  QUOTA_EXCEEDED: 'quotaExceeded',
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Nombres de eventos WebSocket (Phase 3).
 * El gateway del backend emite con `server.to(room).emit(EVENT, payload)`.
 * El cliente se suscribe con `socket.on(EVENT, handler)`.
 */
export const WS_EVENTS = {
  // Lifecycle
  CONNECTED: 'connected',
  CONNECT_ERROR: 'connect_error',
  DISCONNECT: 'disconnect',
  // Orders
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_ITEM_ADDED: 'order.item_added',
  ORDER_ITEM_UPDATED: 'order.item_updated',
  ORDER_ITEM_REMOVED: 'order.item_removed',
  ORDER_STATE_CHANGED: 'order.state_changed',
  ORDER_CANCELLED: 'order.cancelled',
} as const;
export type WsEvent = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

/**
 * Namespace y convención de rooms del WebSocket.
 * El cliente conecta a `${API_ROOT_URL}/ws` y el server auto-join a las
 * rooms derivadas del JWT.
 */
export const WS_NAMESPACE = '/ws';
export const WS_ROOM_PATTERNS = {
  business: (businessId: string) => `business:${businessId}:all`,
  branch: (businessId: string, branchId: string) => `business:${businessId}:branch:${branchId}`,
  prepArea: (businessId: string, areaId: string) =>
    `business:${businessId}:prep_area:${areaId}`,
} as const;
