/**
 * Constantes globales del sistema.
 */

export const APP_NAME = 'SaaS Restaurant';
export const APP_VERSION = '0.1.0';

export const DEFAULT_BUSINESS_SLUG = 'demo';
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
} as const;
