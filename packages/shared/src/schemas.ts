import { z } from 'zod';
import {
  Role,
  BusinessStatus,
  BranchStatus,
  UserStatus,
  ProductType,
  TableStatus,
  TableLocation,
  OrderStatus,
  OrderType,
  OrderChannel,
  PurchaseStatus,
  ReportType,
  ReportFormat,
  ReportStatus,
  CashRegisterStatus,
  CashMovementType,
  CashMovementCategory,
  PaymentMethod,
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
  .pipe(z.email('Email inválido'));

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
  defaultBranchId: z.cuid().optional(),
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
  isMain: z.boolean().optional(),
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = createBranchSchema.partial().extend({
  status: z.nativeEnum(BranchStatus).optional(),
});
export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

export const branchFiltersSchema = z.object({
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type BranchFiltersInput = z.infer<typeof branchFiltersSchema>;

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
  imageUrl: z.url().optional(),
  displayOrder: z.number().int().min(0).default(0),
  branchId: z.cuid().optional(),
  isActive: z.boolean().default(true),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const reorderCategoriesSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.cuid(),
        displayOrder: z.number().int().min(0),
      }),
    )
    .min(1, 'Debe incluir al menos un elemento'),
});
export type ReorderCategoriesInput = z.infer<typeof reorderCategoriesSchema>;

export const categoryFiltersSchema = z.object({
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  branchId: z.cuid().optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type CategoryFiltersInput = z.infer<typeof categoryFiltersSchema>;

const comboItemSchema = z.object({
  productId: z.cuid({ message: 'Producto inválido' }),
  productName: z.string().trim().min(1, 'Nombre del producto requerido'),
  quantity: z.number().int().min(1, 'Cantidad mínima 1').max(999, 'Máximo 999'),
});

const bulkPricingTierSchema = z.object({
  minQty: z.number().int().min(2, 'Mínimo 2 unidades para precio por cantidad'),
  unitPrice: z.number().nonnegative('Precio unitario no puede ser negativo'),
});

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
  imageUrl: z.url().optional(),
  categoryId: z.cuid().optional(),
  preparationAreaId: z.cuid().optional(),
  branchId: z.cuid().optional(),
  sku: z.string().trim().max(64).optional(),
  price: z.number().nonnegative().multipleOf(0.01),
  cost: z.number().nonnegative().multipleOf(0.01).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  trackStock: z.boolean().default(false),
  minStock: z.number().int().nonnegative().optional(),
  productType: z.nativeEnum(ProductType).default(ProductType.SALE),
  comboItems: z.array(comboItemSchema).optional(),
  bulkPricing: z.array(bulkPricingTierSchema).optional(),
  preparationTimeMin: z.number().int().min(0).max(600).optional(),
  isActive: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productFiltersSchema = z.object({
  categoryId: z.cuid().optional(),
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  isAvailable: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  productType: z.nativeEnum(ProductType).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
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
  branchId: z.cuid().optional(),
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
        id: z.cuid(),
        displayOrder: z.number().int().min(0),
      }),
    )
    .min(1, 'Debe incluir al menos un elemento'),
});
export type ReorderPreparationAreasInput = z.infer<typeof reorderPreparationAreasSchema>;

export const preparationAreaFiltersSchema = z.object({
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  branchId: z.cuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type PreparationAreaFiltersInput = z.infer<typeof preparationAreaFiltersSchema>;

// ============== Tables ==============

export const createTableSchema = z.object({
  branchId: z.cuid({ message: 'Sucursal obligatoria' }),
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
  branchId: z.cuid().optional(),
  status: z.nativeEnum(TableStatus).optional(),
  location: z.nativeEnum(TableLocation).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type TableFiltersInput = z.infer<typeof tableFiltersSchema>;

// ============== Customers ==============

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(160),
  taxId: z.string().trim().max(40).optional(),
  taxIdType: z.string().trim().max(16).optional(),
  email: z
    .union([
      z.email('Email inválido').max(160),
      z.literal('').transform(() => undefined as string | undefined),
    ])
    .optional(),
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
    .transform((v) => v === 'true')
    .optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type CustomerFiltersInput = z.infer<typeof customerFiltersSchema>;

// ============== Orders (Phase 3) ==============

/**
 * Crear una orden. Los items son validados contra productos existentes
 * en el service; acá solo tipamos la forma.
 */
export const createOrderItemSchema = z.object({
  productId: z.cuid({ message: 'Producto inválido' }),
  quantity: z.number().int().min(1).max(999),
  notes: z.string().trim().max(500).optional(),
  // Si el frontend calcula unitPrice y lo manda, el service lo IGNORA y
  // recalcula desde Product. El campo existe por compat pero el backend
  // es la única fuente de verdad del precio (guardrail #3).
  unitPrice: z.number().nonnegative().optional(),
});
export type CreateOrderItemInput = z.infer<typeof createOrderItemSchema>;

export const createOrderSchema = z.object({
  type: z.nativeEnum(OrderType).default(OrderType.DINE_IN),
  channel: z.nativeEnum(OrderChannel).default(OrderChannel.POS_WEB),
  tableId: z.cuid().optional(),
  customerId: z.cuid().optional(),
  waiterId: z.cuid().optional(),
  globalNotes: z.string().trim().max(1000).optional(),
  // FASE 7: Loyalty points redemption
  redeemPoints: z.number().int().min(1).optional(),
  discount: z.number().nonnegative().optional(),
  discountReason: z.string().trim().max(255).optional(),
  items: z
    .array(createOrderItemSchema)
    .min(1, 'La orden debe tener al menos un ítem'),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Editar un ítem (qty y notas). No se puede cambiar productId ni unitPrice
 * una vez creado (eso es snapshot inmutable, R8).
 */
export const updateOrderItemSchema = z.object({
  quantity: z.number().int().min(1).max(999).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>;

/**
 * Transición de estado. El service valida la matriz `canTransition`.
 * Nunca se acepta `from` (lo deduce el service desde la BD).
 */
export const transitionOrderSchema = z.object({
  to: z.nativeEnum(OrderStatus).refine(
    (v) => v !== OrderStatus.DRAFT && v !== OrderStatus.CANCELLED,
    { message: 'Use el endpoint /cancel para transicionar a CANCELLED' },
  ),
  reason: z.string().trim().max(500).optional(),
  // Para optimistic lock (R4): el cliente manda la versión que vio.
  expectedVersion: z.number().int().min(0).optional(),
});
export type TransitionOrderInput = z.infer<typeof transitionOrderSchema>;

/**
 * Cancelar una orden. Razón OBLIGATORIA (R6).
 */
export const cancelOrderSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(5, 'La razón debe tener al menos 5 caracteres')
    .max(500, 'La razón es demasiado larga'),
  expectedVersion: z.number().int().min(0).optional(),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

export const orderFiltersSchema = z.object({
  status: z
    .union([
      z.nativeEnum(OrderStatus),
      z.array(z.nativeEnum(OrderStatus)),
    ])
    .optional()
    .transform((v) => (v === undefined ? undefined : Array.isArray(v) ? v : [v])),
  type: z.nativeEnum(OrderType).optional(),
  channel: z.nativeEnum(OrderChannel).optional(),
  tableId: z.cuid().optional(),
  customerId: z.cuid().optional(),
  cashierId: z.cuid().optional(),
  branchId: z.cuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type OrderFiltersInput = z.infer<typeof orderFiltersSchema>;

/**
 * Filtro del endpoint /orders/kds: solo lo necesario para la pantalla de cocina.
 */
export const kdsFiltersSchema = z.object({
  branchId: z.cuid(),
  preparationAreaId: z.cuid().optional(),
  // Por defecto el KDS ve SENT_TO_KITCHEN e IN_PREPARATION.
  states: z
    .array(z.nativeEnum(OrderStatus))
    .default([OrderStatus.SENT_TO_KITCHEN, OrderStatus.IN_PREPARATION]),
});
export type KdsFiltersInput = z.infer<typeof kdsFiltersSchema>;

// ============== Cash / Shifts (FASE 4) ==============

export const openShiftSchema = z.object({
  cashRegisterId: z.string().trim().min(1, 'Caja requerida'),
  openingAmount: z.coerce.number().nonnegative('Monto de apertura no puede ser negativo'),
})

export const closeShiftSchema = z.object({
  closingAmount: z.coerce.number().nonnegative('Monto de cierre no puede ser negativo'),
  closingNotes: z.string().trim().max(500).optional(),
})

export const createCashRegisterSchema = z.object({
  branchId: z.cuid({ message: 'Sucursal inválida' }),
  code: z.string().trim().min(1, 'Código obligatorio'),
})

export const cashFiltersSchema = z.object({
  branchId: z.cuid().optional(),
  status: z.nativeEnum(CashRegisterStatus).optional(),
  userId: z.cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(20),
})
export type CashFiltersInput = z.infer<typeof cashFiltersSchema>

// ============== Cash Movements (FASE 4) ==============

export const createCashMovementSchema = z.object({
  branchId: z.cuid({ message: 'Sucursal obligatoria' }),
  type: z.nativeEnum(CashMovementType),
  category: z.nativeEnum(CashMovementCategory),
  amount: z.coerce.number().min(0.01, 'El monto debe ser mayor a 0'),
  reason: z.string().trim().max(500).optional(),
})

export const cashMovementFiltersSchema = z.object({
  branchId: z.cuid().optional(),
  shiftId: z.cuid().optional(),
  type: z.nativeEnum(CashMovementType).optional(),
  category: z.nativeEnum(CashMovementCategory).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(20),
})
export type CashMovementFiltersInput = z.infer<typeof cashMovementFiltersSchema>

// ============== Payments (FASE 4) ==============

export const paymentItemSchema = z.object({
  method: z.nativeEnum(PaymentMethod),
  amount: z.coerce.number().min(0.01, 'El monto debe ser mayor a 0'),
  tendered: z.coerce.number().min(0).optional(),
  change: z.coerce.number().min(0).optional(),
  reference: z.string().trim().min(1).optional(),
})

export const createPaymentsSchema = z.object({
  payments: z
    .array(paymentItemSchema)
    .min(1, 'Debe incluir al menos un pago')
    .max(10, 'Máximo 10 pagos por orden'),
})

export const previewChangeSchema = z.object({
  tendered: z.coerce.number().min(0.01),
})
export type PreviewChangeInput = z.infer<typeof previewChangeSchema>

// ============== Loyalty / Fidelización (FASE 7) ==============

export const updateLoyaltyProgramSchema = z.object({
  enabled: z.coerce.boolean().optional(),
  pointsPerCurrency: z.coerce.number().positive('Debe ser > 0').optional(),
  pointValue: z.coerce.number().nonnegative('No puede ser negativo').optional(),
  minRedeemPoints: z.coerce.number().int().min(1).optional(),
  maxRedeemPerOrder: z.coerce.number().int().min(1).nullable().optional(),
  autoAward: z.coerce.boolean().optional(),
});
export type UpdateLoyaltyProgramInput = z.infer<typeof updateLoyaltyProgramSchema>;

export const redeemPointsSchema = z.object({
  points: z.number().int().min(1, 'Debe canjear al menos 1 punto'),
});
export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>;

// ============== Plans / Subscription (FASE 6) ==============

export const createPlanSchema = z.object({
  code: z.string().trim().max(50),
  name: z.string().trim().max(255),
  description: z.string().trim().max(500).optional(),
  price: z.coerce.number().min(0),
  currency: z.string().max(3).default('USD'),
  billingPeriod: z.string(),
  maxUsers: z.coerce.number().int().min(1),
  maxBranches: z.coerce.number().int().min(1),
  maxProducts: z.coerce.number().int().min(1),
  maxCategories: z.coerce.number().int().min(1),
  maxMonthlyOrders: z.coerce.number().int().min(1),
  maxStorageMb: z.coerce.number().int().min(1),
  features: z.array(z.string()).optional(),
  isActive: z.coerce.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isPublic: z.coerce.boolean().default(true),
})
export type CreatePlanInput = z.infer<typeof createPlanSchema>

export const planFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(20),
  search: z.string().trim().max(120).optional(),
  isActive: z.coerce.boolean().optional(),
})
export type PlanFiltersInput = z.infer<typeof planFiltersSchema>

export const assignPlanSchema = z.object({
  planId: z.cuid({ message: 'Plan inválido' }),
})
export type AssignPlanInput = z.infer<typeof assignPlanSchema>

// ============== Business Settings (FASE 2) ==============

export const updateBusinessSettingsSchema = z.object({
  name: z.string().trim().max(255).optional(),
  legalName: z.string().trim().max(255).optional(),
  taxId: z.string().trim().max(50).optional(),
  email: z.email('Email inválido').optional(),
  phone: z.string().trim().max(40).optional(),
  currency: z.string().max(3).optional(),
  timezone: z.string().max(64).optional(),
  moduleReports: z.coerce.boolean().optional(),
  moduleInventory: z.coerce.boolean().optional(),
  modulePosStations: z.coerce.boolean().optional(),
  moduleDeliveryApp: z.coerce.boolean().optional(),
})
export type UpdateBusinessSettingsInput = z.infer<typeof updateBusinessSettingsSchema>

// ============== Inventory (FASE 6) ==============

export const inventoryFiltersSchema = z.object({
  productId: z.cuid().optional(),
  branchId: z.cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(20),
})
export type InventoryFiltersInput = z.infer<typeof inventoryFiltersSchema>

/**
 * Ajuste manual de inventario (F4-03).
 * type: 'IN' para entrada, 'OUT' para salida.
 */
export const adjustInventorySchema = z.object({
  productId: z.cuid({ message: 'Producto inválido' }),
  branchId: z.cuid({ message: 'Sucursal obligatoria' }),
  type: z.enum(['IN', 'OUT']),
  quantity: z.number().positive('La cantidad debe ser mayor a 0'),
  reason: z.string().trim().min(1, 'El motivo es obligatorio').max(500, 'Motivo demasiado largo'),
})
export type AdjustInventoryInput = z.infer<typeof adjustInventorySchema>

/**
 * Re-export de enums para conveniencia en formularios.
 */
// ============== Suppliers (FASE 6) ==============

export const createSupplierSchema = z.object({
  branchId: z.cuid().optional(),
  name: z.string().trim().min(1).max(160),
  contactName: z.string().trim().max(120).optional(),
  email: z.union([z.email('Email inválido'), z.literal('').transform(() => undefined)]).optional(),
  phone: z.string().trim().max(40).optional(),
  address: z.string().trim().max(255).optional(),
  taxId: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(500).optional(),
  isActive: z.boolean().default(true),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export const updateSupplierSchema = createSupplierSchema.partial();
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const supplierFiltersSchema = z.object({
  isActive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  branchId: z.cuid().optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type SupplierFiltersInput = z.infer<typeof supplierFiltersSchema>;

// ============== Purchases (FASE 6) ==============

export const createPurchaseItemSchema = z.object({
  productId: z.cuid({ message: 'Producto inválido' }),
  quantity: z.number().positive('Cantidad debe ser mayor a 0'),
  unitCost: z.number().nonnegative('Costo unitario inválido'),
});
export type CreatePurchaseItemInput = z.infer<typeof createPurchaseItemSchema>;

export const createPurchaseSchema = z.object({
  branchId: z.cuid({ message: 'Sucursal obligatoria' }),
  supplierId: z.cuid().optional(),
  purchaseNumber: z.string().trim().min(1, 'N° de compra obligatorio').max(64),
  notes: z.string().trim().max(500).optional(),
  taxTotal: z.number().nonnegative().default(0),
  items: z.array(createPurchaseItemSchema).min(1, 'Debe tener al menos un ítem'),
});
export type CreatePurchaseInput = z.infer<typeof createPurchaseSchema>;

export const updatePurchaseSchema = z.object({
  supplierId: z.cuid().optional(),
  purchaseNumber: z.string().trim().min(1).max(64).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  status: z.nativeEnum(PurchaseStatus).optional(),
});
export type UpdatePurchaseInput = z.infer<typeof updatePurchaseSchema>;

export const completePurchaseSchema = z.object({
  receivedAt: z.coerce.date().optional(),
});

export const purchaseFiltersSchema = z.object({
  branchId: z.cuid().optional(),
  supplierId: z.cuid().optional(),
  status: z.nativeEnum(PurchaseStatus).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
export type PurchaseFiltersInput = z.infer<typeof purchaseFiltersSchema>;

// ============== Reports (FASE 6) ==============

export const requestReportSchema = z.object({
  type: z.nativeEnum(ReportType),
  format: z.nativeEnum(ReportFormat).default(ReportFormat.PDF),
  params: z
    .object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      branchId: z.cuid().optional(),
    })
    .optional()
    .default({}),
});
export type RequestReportInput = z.infer<typeof requestReportSchema>;

export const reportFiltersSchema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  type: z.nativeEnum(ReportType).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ReportFiltersInput = z.infer<typeof reportFiltersSchema>;

export {
  Role,
  BusinessStatus,
  BranchStatus,
  UserStatus,
  ProductType,
  TableStatus,
  TableLocation,
  OrderStatus,
  OrderType,
  OrderChannel,
  PurchaseStatus,
  ReportType,
  ReportFormat,
  ReportStatus,
};
