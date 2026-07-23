import type {
  Role,
  SaaSRole,
  BusinessStatus,
  BranchStatus,
  UserStatus,
  ProductType,
  TableStatus,
  TableLocation,
  OrderStatus,
  OrderType,
  OrderChannel,
  CashRegisterStatus,
  ShiftStatus,
  BillingPeriod,
  SubscriptionStatus,
  InventoryMovementType,
  InventoryReferenceType,
  PurchaseStatus,
  ReportType,
  ReportFormat,
  ReportStatus,
  PaymentMethod,
  CashMovementType,
  CashMovementCategory,
  AuditAction,
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
  // FASE 6: Plan/SaaS
  planId: string | null;
  subscription: SubscriptionDTO | null;
  // FASE 6: Feature flags
  moduleReports: boolean;
  moduleInventory: boolean;
  modulePosStations: boolean;
  moduleDeliveryApp: boolean;
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
  // Counts de dependencias activas (para UI)
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
  branchIds: string[];
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
 * userType discrimina entre usuarios de negocio y de plataforma (SaaS).
 */
export interface JwtPayload {
  /** user id */
  sub: string;
  email: string;
  /** Discriminador: 'business' (restaurant) o 'saas' (plataforma) */
  userType: 'business' | 'saas';
  /** Solo para business users */
  businessId?: string;
  /** Solo para business users */
  role?: Role;
  /** Solo para SaaS users */
  saasRole?: SaaSRole;
  /** branchIds accesibles por el usuario (vacío = todos los del business) */
  branchIds?: string[];
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

/**
 * Item individual de un combo (F5-01).
 */
export interface ComboItemDTO {
  productId: string;
  productName: string;
  quantity: number;
}

/**
 * Escalón de precio por cantidad (F5-02).
 */
export interface BulkPricingTierDTO {
  minQty: number;
  unitPrice: number;
}

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
  currentStock: string;
  productType: ProductType;
  preparationTimeMin: number | null;
  comboItems: ComboItemDTO[] | null;
  bulkPricing: BulkPricingTierDTO[] | null;
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
  cost: string | null;
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
  // FASE 7: Loyalty
  loyaltyPoints: number;
  loyaltyPointsEarned: number;
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
  | 'loyaltyPoints'
  | 'loyaltyPointsEarned'
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

// =================== Phase 3: Orders ===================

/**
 * Item de una orden. El snapshot inmutable (R8) hace que los campos
 * productName, unitPrice, taxRate, preparationAreaId y preparationAreaName
 * NO cambien aunque el Product original sea editado o eliminado.
 */
export interface OrderItemDTO {
  id: string;
  businessId: string;
  orderId: string;
  productId: string | null;
  // Snapshot
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

export interface OrderStateLogDTO {
  id: string;
  businessId: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedByUserId: string;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface OrderDTO {
  id: string;
  businessId: string;
  branchId: string;
  tableId: string | null;
  customerId: string | null;
  cashierId: string;
  waiterId: string | null;
  type: OrderType;
  channel: OrderChannel;
  status: OrderStatus;
  subtotal: string;
  taxTotal: string;
  total: string;
  globalNotes: string | null;
  cashRegisterId: string | null;
  shiftId: string | null;
  version: number;
  // FASE 7: Discount / Loyalty
  discount: string;
  discountReason: string | null;
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  cancellationReason: string | null;
  items: OrderItemDTO[];
  stateLogs?: OrderStateLogDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderListItemDTO {
  id: string;
  businessId: string;
  branchId: string;
  tableId: string | null;
  /** Número de mesa (populado por el backend al listar). */
  tableNumber: string | null;
  type: OrderType;
  status: OrderStatus;
  total: string;
  itemCount: number;
  cashierId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Forma del input para crear una orden.
 * Coincide con CreateOrderInput del schemas.ts pero expuesta como tipo.
 */
export interface CreateOrderDTO {
  type?: OrderType;
  channel?: OrderChannel;
  tableId?: string;
  customerId?: string;
  waiterId?: string;
  globalNotes?: string;
  items: Array<{
    productId: string;
    quantity: number;
    notes?: string;
    unitPrice?: number;
  }>;
  // FASE 7: Loyalty points to redeem (optional)
  redeemPoints?: number;
  discount?: number;
  discountReason?: string;
}

export type UpdateOrderItemDTO = {
  quantity?: number;
  notes?: string | null;
};

export interface TransitionOrderDTO {
  to: OrderStatus;
  reason?: string;
  expectedVersion?: number;
}

export interface CancelOrderDTO {
  reason: string;
  expectedVersion?: number;
}

// =================== Phase 3: KDS view ===================

/**
 * Vista optimizada para KDS. El backend agrupa por preparation area
 * para evitar que el cliente tenga que re-armar la pantalla.
 */
export interface KdsOrderDTO {
  id: string;
  version: number;
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

export interface KdsAreaGroupDTO {
  preparationAreaId: string;
  preparationAreaName: string;
  preparationAreaCode: string;
  orders: KdsOrderDTO[];
}

export interface KdsViewDTO {
  branchId: string;
  generatedAt: string;
  areas: KdsAreaGroupDTO[];
}

// =================== Phase 3: WebSocket payloads ===================

export interface WsConnectedPayload {
  userId: string;
  businessId: string;
  branchIds: string[];
  joinedRooms: string[];
}

export interface WsOrderCreatedPayload {
  order: OrderDTO;
}
export interface WsOrderUpdatedPayload {
  order: OrderDTO;
}
export interface WsOrderItemAddedPayload {
  orderId: string;
  item: OrderItemDTO;
}
export interface WsOrderItemUpdatedPayload {
  orderId: string;
  item: OrderItemDTO;
}
export interface WsOrderItemRemovedPayload {
  orderId: string;
  itemId: string;
}
export interface WsOrderStateChangedPayload {
  orderId: string;
  from: OrderStatus;
  to: OrderStatus;
  byUserId: string;
  at: string;
  reason: string | null;
}
export interface WsOrderCancelledPayload {
  orderId: string;
  cancelledByUserId: string;
  cancellationReason: string;
  at: string;
}

// =================== Phase 3: Cash foundation (D1=A) ===================

export interface CreateCashRegisterInput {
  branchId: string;
  code: string;
}

export interface CashRegisterDTO {
  id: string;
  businessId: string;
  branchId: string;
  code: string;
  status: CashRegisterStatus;
  openedAt: string;
  closedAt: string | null;
  openedByUserId: string;
  closedByUserId: string | null;
}

export interface ShiftDTO {
  id: string;
  businessId: string;
  branchId: string;
  cashRegisterId: string;
  userId: string;
  status: ShiftStatus;
  openedAt: string;
  closedAt: string | null;
  openingAmount: string;
  closingAmount: string | null;
  expectedAmount: string | null;
  difference: string | null;
  closingNotes: string | null;
}

export interface ShiftDetailDTO extends ShiftDTO {
  cashPaymentsTotal: string;
  cashMovementsInTotal: string;
  cashMovementsOutTotal: string;
}

export interface ArqueoDTO {
  openingAmount: string;
  cashPaymentsTotal: string;
  cashMovementsInTotal: string;
  cashMovementsOutTotal: string;
  expectedAmount: string;
}

export interface OpenShiftInput {
  cashRegisterId: string;
  openingAmount: number;
}

export interface CloseShiftInput {
  closingAmount: number;
  closingNotes?: string;
}

// =================== FASE 4: Pagos ===================

export interface PaymentDTO {
  id: string;
  businessId: string;
  orderId: string;
  method: PaymentMethod;
  amount: string;
  tendered: string | null;
  change: string | null;
  reference: string | null;
  cashierId: string;
  createdAt: string;
}

export interface PaymentItemInput {
  method: PaymentMethod;
  amount: number;
  tendered?: number;
  change?: number;
  reference?: string;
}

export interface CreatePaymentsInput {
  payments: PaymentItemInput[];
}

export interface PayOrderResultDTO {
  order: {
    id: string;
    status: 'PAID';
    total: string;
    paidAt: string;
    payments: Array<{
      id: string;
      method: PaymentMethod;
      amount: string;
      tendered: string | null;
      change: string | null;
      reference: string | null;
    }>;
  };
}

// =================== FASE 4: Movimientos de caja ===================

export interface CashMovementDTO {
  id: string;
  businessId: string;
  branchId: string;
  shiftId: string | null;
  type: CashMovementType;
  category: CashMovementCategory;
  amount: string;
  reason: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface CreateCashMovementInput {
  branchId: string;
  type: CashMovementType;
  category: CashMovementCategory;
  amount: number;
  reason?: string;
}

export interface CashMovementSummaryDTO {
  totalIn: string;
  totalOut: string;
  net: string;
  count: number;
}

// =================== FASE 4: Audit ===================

export interface AuditLogDTO {
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

// =================== FASE 5: POS Stations ===================

export interface PosStationDTO {
  id: string;
  businessId: string;
  branchId: string;
  stationCode: string;
  name: string | null;
  deviceName: string | null;
  isActive: boolean;
  activatedAt: string | null;
  lastSeenAt: string | null;
}

export interface ActivateStationInput {
  businessSlug: string;
  stationCode: string;
  deviceName?: string;
}

// =================== FASE 6: SaaS / Planes ===================

export interface PlanDTO {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  billingPeriod: BillingPeriod;
  maxUsers: number;
  maxBranches: number;
  maxProducts: number;
  maxCategories: number;
  maxMonthlyOrders: number;
  maxStorageMb: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionDTO {
  id: string;
  businessId: string;
  planId: string;
  plan: PlanDTO | null;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  cancelledAt: string | null;
}

// =================== FASE 6: Inventario ===================

export interface SupplierDTO {
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

export interface SupplierListItemDTO {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  isActive: boolean;
  purchaseCount?: number;
}

export type CreateSupplierDTO = Omit<
  SupplierDTO,
  'id' | 'businessId' | 'createdAt' | 'updatedAt'
>;

export type UpdateSupplierDTO = Partial<CreateSupplierDTO>;

export interface PurchaseItemDTO {
  id: string;
  purchaseId: string;
  productId: string | null;
  productName: string;
  unitCost: string;
  quantity: string;
  lineTotal: string;
  createdAt: string;
}

export interface PurchaseDTO {
  id: string;
  businessId: string;
  branchId: string;
  supplierId: string | null;
  purchaseNumber: string;
  status: PurchaseStatus;
  subtotal: string;
  taxTotal: string;
  total: string;
  notes: string | null;
  receivedAt: string | null;
  receivedBy: string | null;
  invoiceUrl: string | null;
  createdById: string;
  supplier: SupplierDTO | null;
  items: PurchaseItemDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseListItemDTO {
  id: string;
  purchaseNumber: string;
  supplierName: string | null;
  status: PurchaseStatus;
  total: string;
  itemCount: number;
  createdAt: string;
}

export interface InventoryMovementDTO {
  id: string;
  businessId: string;
  branchId: string;
  productId: string;
  productName?: string;
  type: InventoryMovementType;
  referenceType: InventoryReferenceType;
  referenceId: string | null;
  quantity: string;
  unitCost: string | null;
  totalCost: string | null;
  runningBalance: string;
  notes: string | null;
  createdAt: string;
}

export interface InventoryKardexDTO {
  productId: string;
  productName: string;
  sku: string | null;
  currentStock: string;
  movements: InventoryMovementDTO[];
}

export interface LowStockProductDTO {
  id: string;
  name: string;
  sku: string | null;
  currentStock: string;
  minStock: number | null;
}

// =================== FASE 7: Loyalty / Programa de Fidelización ===================

export interface LoyaltyProgramDTO {
  id: string;
  businessId: string;
  enabled: boolean;
  pointsPerCurrency: number;
  pointValue: number;
  minRedeemPoints: number;
  maxRedeemPerOrder: number | null;
  autoAward: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyRedemptionDTO {
  id: string;
  customerId: string;
  orderId: string;
  pointsUsed: number;
  discountAmount: string;
  notes: string | null;
  createdAt: string;
}

export interface CustomerLoyaltyDTO {
  customer: CustomerDTO;
  program: LoyaltyProgramDTO | null;
  availablePoints: number;
  pointsEarned: number;
  maxRedeemable: number;
  pointsToNextAward: number;
}

export interface RedeemPointsDTO {
  points: number;
  discount: number;
  discountReason: string;
}

export type UpdateLoyaltyProgramDTO = Partial<Omit<LoyaltyProgramDTO, 'id' | 'businessId' | 'createdAt' | 'updatedAt'>>;

// =================== FASE 6: Reportes ===================

export interface ReportDTO {
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


