import { z } from 'zod';
import {
  Role,
  BusinessStatus,
  BranchStatus,
  UserStatus,
  ProductType,
  TableStatus,
  TableLocation,
} from './enums';

/**
 * Esquemas Zod compartidos. Reutilizables para validar payloads en
 * backend (login, refresh) y frontend (formularios).
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'El email es obligatorio')
  .email('Email inválido');

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(128, 'La contraseña es demasiado larga');

/**
 * Login multi-tenant: email + password + businessSlug.
 * El businessSlug identifica al tenant, el email es único DENTRO del tenant.
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  businessSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'El slug del negocio es obligatorio')
    .max(64, 'Slug demasiado largo'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
});

export type RefreshInput = z.infer<typeof refreshSchema>;

/**
 * Esquemas de creación para entidades principales. Útiles para validación
 * en futuras APIs REST. Phase 1 no expone estos endpoints, pero los dejamos
 * listos para Fase 2+.
 */
export const createBusinessSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  legalName: z.string().trim().max(180).optional(),
  taxId: z.string().trim().max(40).optional(),
  email: emailSchema,
  phone: z.string().trim().max(40).optional(),
  currency: z.string().length(3).default('BOB'),
  timezone: z.string().trim().min(1).default('America/La_Paz'),
});

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional(),
  role: z.nativeEnum(Role).default(Role.CAJERO),
  defaultBranchId: z.string().cuid().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const createBranchSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1)
    .max(16)
    .regex(/^[A-Z0-9_-]+$/, 'Código inválido'),
  address: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(40).optional(),
  isMain: z.boolean().default(false),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug inválido'),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().url().optional(),
  displayOrder: z.number().int().min(0).default(0),
  branchId: z.string().cuid().optional(),
  isActive: z.boolean().default(true),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const reorderCategoriesSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().cuid(),
        displayOrder: z.number().int().min(0),
      }),
    )
    .min(1, 'Debe incluir al menos un elemento'),
});
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;

export const categoryFiltersSchema = z.object({
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  branchId: z.string().cuid().optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type CategoryFiltersInput = z.infer<typeof categoryFiltersSchema>;

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug inválido'),
  description: z.string().trim().max(1000).optional(),
  imageUrl: z.string().url().optional(),
  categoryId: z.string().cuid().optional(),
  preparationAreaId: z.string().cuid().optional(),
  branchId: z.string().cuid().optional(),
  sku: z.string().trim().max(64).optional(),
  price: z.number().nonnegative().multipleOf(0.01),
  cost: z.number().nonnegative().multipleOf(0.01).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  trackStock: z.boolean().default(false),
  minStock: z.number().int().nonnegative().optional(),
  productType: z.nativeEnum(ProductType).default(ProductType.SALE),
  preparationTimeMin: z.number().int().min(0).max(600).optional(),
  isActive: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productFiltersSchema = z.object({
  categoryId: z.string().cuid().optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  isAvailable: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  productType: z.nativeEnum(ProductType).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;

// ============== Preparation Areas ==============

export const createPreparationAreaSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1)
    .max(16)
    .regex(/^[A-Z0-9_-]+$/, 'Código inválido'),
  description: z.string().trim().max(500).optional(),
  branchId: z.string().cuid().optional(),
  displayOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});
export type CreatePreparationAreaInput = z.infer<typeof createPreparationAreaSchema>;

export const updatePreparationAreaSchema = createPreparationAreaSchema.partial();
export type UpdatePreparationAreaInput = z.infer<typeof updatePreparationAreaSchema>;

export const reorderPreparationAreasSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().cuid(),
        displayOrder: z.number().int().min(0),
      }),
    )
    .min(1, 'Debe incluir al menos un elemento'),
});
export type ReorderPreparationAreasInput = z.infer<typeof reorderPreparationAreasSchema>;

export const preparationAreaFiltersSchema = z.object({
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  branchId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PreparationAreaFiltersInput = z.infer<typeof preparationAreaFiltersSchema>;

// ============== Tables ==============

export const createTableSchema = z.object({
  branchId: z.string().cuid({ message: 'Sucursal obligatoria' }),
  number: z.string().trim().min(1).max(16),
  capacity: z.number().int().min(1).max(50).default(4),
  location: z.nativeEnum(TableLocation).default(TableLocation.INDOOR),
  displayOrder: z.number().int().min(0).default(0),
  notes: z.string().trim().max(500).optional(),
  posX: z.number().int().min(0).optional(),
  posY: z.number().int().min(0).optional(),
});
export type CreateTableInput = z.infer<typeof createTableSchema>;

export const updateTableSchema = createTableSchema.partial().omit({ branchId: true });
export type UpdateTableInput = z.infer<typeof updateTableSchema>;

export const changeTableStatusSchema = z.object({
  status: z.nativeEnum(TableStatus),
  reason: z.string().trim().max(255).optional(),
});
export type ChangeTableStatusInput = z.infer<typeof changeTableStatusSchema>;

export const tableFiltersSchema = z.object({
  branchId: z.string().cuid().optional(),
  status: z.nativeEnum(TableStatus).optional(),
  location: z.nativeEnum(TableLocation).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type TableFiltersInput = z.infer<typeof tableFiltersSchema>;

// ============== Customers ==============

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(160),
  taxId: z.string().trim().max(40).optional(),
  taxIdType: z.string().trim().max(16).optional(),
  email: z.string().trim().email().max(160).optional().or(z.literal('').transform(() => undefined)),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(255).optional(),
  addressReference: z.string().trim().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().trim().max(1000).optional(),
  isActive: z.boolean().default(true),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const customerFiltersSchema = z.object({
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type CustomerFiltersInput = z.infer<typeof customerFiltersSchema>;

/**
 * Re-export de enums para conveniencia en formularios.
 */
export {
  Role,
  BusinessStatus,
  BranchStatus,
  UserStatus,
  ProductType,
  TableStatus,
  TableLocation,
};
