import type {
  Role,
  BusinessStatus,
  BranchStatus,
  UserStatus,
  ProductType,
  TableStatus,
  TableLocation,
} from './enums';

/**
 * Tipos compartidos entre backend y frontend. Se mantienen alineados con el
 * schema de Prisma pero se exponen como tipos "planos" (sin dependencias
 * del cliente Prisma) para que el frontend no tenga que arrastrar el cliente.
 *
 * Convención de nombres:
 *  - *DTO = forma de la respuesta del API (snake_case por compat con frontend).
 *  - *Create / *Update = payloads de entrada (mutaciones).
 *  - Decimals de Prisma → string en DTOs.
 *  - Fechas → string ISO 8601.
 */

export interface BusinessDTO {
  id: string;
  name: string;
  slug: string;
  legalName: string | null;
  taxId: string | null;
  email: string;
  phone: string | null;
  logoUrl: string | null;
  currency: string;
  timezone: string;
  status: BusinessStatus;
  plan: string;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BranchDTO {
  id: string;
  businessId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  isMain: boolean;
  status: BranchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserDTO {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  businessId: string;
  defaultBranchId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthenticatedUserDTO {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  businessId: string;
  defaultBranchId: string | null;
  business: BusinessDTO;
  branches: BranchDTO[];
}

/**
 * Payload JWT (access token). Mantener minimalista.
 */
export interface JwtPayload {
  /** user id */
  sub: string;
  email: string;
  businessId: string;
  role: Role;
  /** branchIds accesibles por el usuario (vacío = todos los del business) */
  branchIds: string[];
  /** tipo de token */
  typ: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthTokensDTO {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUserDTO;
}

// =================== Envelope de paginación ===================

export interface PaginationMetaDTO {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponseDTO<T> {
  data: T[];
  meta: PaginationMetaDTO;
}

// =================== Categorías ===================

export interface CategoryDTO {
  id: string;
  businessId: string;
  branchId: string | null;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  /** Cantidad de productos activos en la categoría. */
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryListItemDTO {
  id: string;
  name: string;
  slug: string;
  branchId: string | null;
  isActive: boolean;
  displayOrder: number;
}

export type CreateCategoryDTO = Omit<
  CategoryDTO,
  'id' | 'businessId' | 'productCount' | 'createdAt' | 'updatedAt'
>;

export type UpdateCategoryDTO = Partial<CreateCategoryDTO>;

// =================== Productos ===================

export interface ProductDTO {
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
  /** Decimal como string (serializado por Prisma). */
  price: string;
  cost: string | null;
  taxRate: string | null;
  isActive: boolean;
  isAvailable: boolean;
  minStock: number | null;
  trackStock: boolean;
  productType: ProductType;
  preparationTimeMin: number | null;
  category: CategoryDTO | null;
  preparationArea: PreparationAreaDTO | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListItemDTO {
  id: string;
  name: string;
  slug: string;
  categoryId: string | null;
  imageUrl: string | null;
  price: string;
  productType: ProductType;
  isAvailable: boolean;
}

export type CreateProductDTO = Omit<
  ProductDTO,
  | 'id'
  | 'businessId'
  | 'category'
  | 'preparationArea'
  | 'createdAt'
  | 'updatedAt'
>;

export type UpdateProductDTO = Partial<CreateProductDTO>;

// =================== Áreas de preparación ===================

export interface PreparationAreaDTO {
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

export interface PreparationAreaListItemDTO {
  id: string;
  name: string;
  code: string;
  branchId: string | null;
  isActive: boolean;
  displayOrder: number;
}

export type CreatePreparationAreaDTO = Omit<
  PreparationAreaDTO,
  'id' | 'businessId' | 'createdAt' | 'updatedAt'
>;

export type UpdatePreparationAreaDTO = Partial<CreatePreparationAreaDTO>;

// =================== Mesas ===================

export interface TableDTO {
  id: string;
  businessId: string;
  branchId: string;
  number: string;
  capacity: number;
  location: TableLocation;
  status: TableStatus;
  displayOrder: number;
  notes: string | null;
  posX: number | null;
  posY: number | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateTableDTO = Omit<
  TableDTO,
  'id' | 'businessId' | 'status' | 'createdAt' | 'updatedAt'
>;

export type UpdateTableDTO = Partial<Omit<CreateTableDTO, 'branchId'>>;

// =================== Clientes ===================

export interface CustomerDTO {
  id: string;
  businessId: string;
  name: string;
  taxId: string | null;
  taxIdType: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  addressReference: string | null;
  /** Coordenadas como string (Prisma Decimal). */
  latitude: string | null;
  longitude: string | null;
  notes: string | null;
  isActive: boolean;
  totalOrders: number;
  /** Decimal como string. */
  totalSpent: string;
  lastOrderAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateCustomerDTO = Omit<
  CustomerDTO,
  | 'id'
  | 'businessId'
  | 'totalOrders'
  | 'totalSpent'
  | 'lastOrderAt'
  | 'createdAt'
  | 'updatedAt'
>;

export type UpdateCustomerDTO = Partial<CreateCustomerDTO>;

// =================== Audit logs (Phase 4 los formaliza) ===================

export interface AuditLogEntryDTO {
  businessId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}
