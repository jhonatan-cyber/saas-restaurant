/**
 * Enums compartidos entre backend y frontend.
 * Mantener sincronizados con el schema de Prisma (api/prisma/schema.prisma).
 */

export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  CAJERO: 'CAJERO',
  MESERO: 'MESERO',
  COCINA: 'COCINA',
  REPARTIDOR: 'REPARTIDOR',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ROLE_VALUES: readonly Role[] = Object.values(Role);

export const BusinessStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  TRIAL: 'TRIAL',
} as const;

export type BusinessStatus = (typeof BusinessStatus)[keyof typeof BusinessStatus];

export const BUSINESS_STATUS_VALUES: readonly BusinessStatus[] = Object.values(BusinessStatus);

export const BranchStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type BranchStatus = (typeof BranchStatus)[keyof typeof BranchStatus];

export const BRANCH_STATUS_VALUES: readonly BranchStatus[] = Object.values(BranchStatus);

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  INVITED: 'INVITED',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const USER_STATUS_VALUES: readonly UserStatus[] = Object.values(UserStatus);

export const ProductType = {
  SALE: 'SALE',
  COMBO: 'COMBO',
  ADDON: 'ADDON',
  SERVICE: 'SERVICE',
  INGREDIENT: 'INGREDIENT',
} as const;

export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export const PRODUCT_TYPE_VALUES: readonly ProductType[] = Object.values(ProductType);

export const TableStatus = {
  FREE: 'FREE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
} as const;

export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const TABLE_STATUS_VALUES: readonly TableStatus[] = Object.values(TableStatus);

export const TableLocation = {
  INDOOR: 'INDOOR',
  OUTDOOR: 'OUTDOOR',
  BAR: 'BAR',
  PATIO: 'PATIO',
  TERRACE: 'TERRACE',
  OTHER: 'OTHER',
} as const;

export type TableLocation = (typeof TableLocation)[keyof typeof TableLocation];

export const TABLE_LOCATION_VALUES: readonly TableLocation[] = Object.values(TableLocation);

/**
 * Etiquetas legibles para UI. No se usan en lógica.
 */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Administrador',
  OWNER: 'Dueño',
  ADMIN: 'Administrador',
  CAJERO: 'Cajero',
  MESERO: 'Mesero',
  COCINA: 'Cocina',
  REPARTIDOR: 'Repartidor',
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  SALE: 'Venta',
  COMBO: 'Combo',
  ADDON: 'Adicional',
  SERVICE: 'Servicio',
  INGREDIENT: 'Ingrediente',
};

export const TABLE_STATUS_LABELS: Record<TableStatus, string> = {
  FREE: 'Libre',
  OCCUPIED: 'Ocupada',
  RESERVED: 'Reservada',
};

export const TABLE_LOCATION_LABELS: Record<TableLocation, string> = {
  INDOOR: 'Interior',
  OUTDOOR: 'Exterior',
  BAR: 'Barra',
  PATIO: 'Patio',
  TERRACE: 'Terraza',
  OTHER: 'Otro',
};

// ==================== Phase 3: Orders ====================

export const OrderStatus = {
  DRAFT: 'DRAFT',                    // RESERVADO — no se usa en F3
  PENDING: 'PENDING',
  SENT_TO_KITCHEN: 'SENT_TO_KITCHEN',
  IN_PREPARATION: 'IN_PREPARATION',
  READY: 'READY',
  DELIVERED: 'DELIVERED',
  PAID: 'PAID',
  CANCELLED: 'CANCELLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export const ORDER_STATUS_VALUES: readonly OrderStatus[] = Object.values(OrderStatus);

export const OrderType = {
  DINE_IN: 'DINE_IN',
  TAKEOUT: 'TAKEOUT',
  DELIVERY: 'DELIVERY',
} as const;
export type OrderType = (typeof OrderType)[keyof typeof OrderType];
export const ORDER_TYPE_VALUES: readonly OrderType[] = Object.values(OrderType);

export const OrderChannel = {
  POS_WEB: 'POS_WEB',
  POS_DESKTOP: 'POS_DESKTOP',
  MOBILE: 'MOBILE',
  KIOSK: 'KIOSK',
  ADMIN: 'ADMIN',
} as const;
export type OrderChannel = (typeof OrderChannel)[keyof typeof OrderChannel];
export const ORDER_CHANNEL_VALUES: readonly OrderChannel[] = Object.values(OrderChannel);

// Forward-compat F4
export const CashRegisterStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;
export type CashRegisterStatus = (typeof CashRegisterStatus)[keyof typeof CashRegisterStatus];
export const CASH_REGISTER_STATUS_VALUES: readonly CashRegisterStatus[] =
  Object.values(CashRegisterStatus);

export const ShiftStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
} as const;
export type ShiftStatus = (typeof ShiftStatus)[keyof typeof ShiftStatus];
export const SHIFT_STATUS_VALUES: readonly ShiftStatus[] = Object.values(ShiftStatus);

export const CASH_REGISTER_STATUS_LABELS: Record<CashRegisterStatus, string> = {
  OPEN: 'Abierta',
  CLOSED: 'Cerrada',
};

export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  OPEN: 'Abierto',
  CLOSED: 'Cerrado',
};

// ==================== FASE 4: Pagos ====================

export const PaymentMethod = {
  CASH: 'CASH',
  QR: 'QR',
  TRANSFER: 'TRANSFER',
  CARD: 'CARD',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
export const PAYMENT_METHOD_VALUES: readonly PaymentMethod[] = Object.values(PaymentMethod);

// ==================== FASE 4: Movimientos de caja ====================

export const CashMovementType = {
  CASH_IN: 'CASH_IN',
  CASH_OUT: 'CASH_OUT',
} as const;
export type CashMovementType = (typeof CashMovementType)[keyof typeof CashMovementType];
export const CASH_MOVEMENT_TYPE_VALUES: readonly CashMovementType[] =
  Object.values(CashMovementType);

export const CashMovementCategory = {
  // Ingresos
  OWNER_INVESTMENT: 'OWNER_INVESTMENT',
  SUPPLIER_REFUND: 'SUPPLIER_REFUND',
  LOAN_RECEIVED: 'LOAN_RECEIVED',
  TIP: 'TIP',
  OTHER_IN: 'OTHER_IN',
  // Egresos
  SUPPLIES: 'SUPPLIES',
  MAINTENANCE: 'MAINTENANCE',
  SALARY_ADVANCE: 'SALARY_ADVANCE',
  RENT: 'RENT',
  UTILITIES: 'UTILITIES',
  OWNER_WITHDRAWAL: 'OWNER_WITHDRAWAL',
  OTHER_OUT: 'OTHER_OUT',
} as const;
export type CashMovementCategory =
  (typeof CashMovementCategory)[keyof typeof CashMovementCategory];
export const CASH_MOVEMENT_CATEGORY_VALUES: readonly CashMovementCategory[] =
  Object.values(CashMovementCategory);

export const CASH_MOVEMENT_CATEGORY_LABELS: Record<CashMovementCategory, string> = {
  OWNER_INVESTMENT: 'Aporte del dueño',
  SUPPLIER_REFUND: 'Devolución de proveedor',
  LOAN_RECEIVED: 'Préstamo recibido',
  TIP: 'Propina',
  OTHER_IN: 'Otro ingreso',
  SUPPLIES: 'Insumos',
  MAINTENANCE: 'Mantenimiento',
  SALARY_ADVANCE: 'Adelanto de sueldo',
  RENT: 'Alquiler',
  UTILITIES: 'Servicios (luz/agua/gas)',
  OWNER_WITHDRAWAL: 'Retiro del dueño',
  OTHER_OUT: 'Otro egreso',
};

// ==================== FASE 4: Auditoría ====================

export const AuditAction = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  SOFT_DELETE: 'SOFT_DELETE',
  HARD_DELETE: 'HARD_DELETE',
  VOID: 'VOID',
  PRICE_CHANGE: 'PRICE_CHANGE',
  DISCOUNT: 'DISCOUNT',
  SHIFT_OPEN: 'SHIFT_OPEN',
  SHIFT_CLOSE: 'SHIFT_CLOSE',
  SHIFT_ARQUEO: 'SHIFT_ARQUEO',
  CASH_MOVEMENT: 'CASH_MOVEMENT',
  PAYMENT: 'PAYMENT',
  STATION_ACTIVATE: 'STATION_ACTIVATE',
  STATION_DEACTIVATE: 'STATION_DEACTIVATE',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
export const AUDIT_ACTION_VALUES: readonly AuditAction[] = Object.values(AuditAction);

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: 'Creado',
  UPDATE: 'Actualizado',
  SOFT_DELETE: 'Eliminado (soft)',
  HARD_DELETE: 'Eliminado (hard)',
  VOID: 'Anulado',
  PRICE_CHANGE: 'Cambio de precio',
  DISCOUNT: 'Descuento aplicado',
  SHIFT_OPEN: 'Apertura de turno',
  SHIFT_CLOSE: 'Cierre de turno',
  SHIFT_ARQUEO: 'Arqueo de caja',
  CASH_MOVEMENT: 'Movimiento de caja',
  PAYMENT: 'Pago registrado',
  STATION_ACTIVATE: 'Estación POS activada',
  STATION_DEACTIVATE: 'Estación POS desactivada',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Borrador',
  PENDING: 'Pendiente',
  SENT_TO_KITCHEN: 'Enviado a cocina',
  IN_PREPARATION: 'En preparación',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  PAID: 'Pagado',
  CANCELLED: 'Cancelado',
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  DINE_IN: 'En mesa',
  TAKEOUT: 'Para llevar',
  DELIVERY: 'Delivery',
};

export const ORDER_CHANNEL_LABELS: Record<OrderChannel, string> = {
  POS_WEB: 'POS Web',
  POS_DESKTOP: 'POS Escritorio',
  MOBILE: 'Móvil',
  KIOSK: 'Kiosko',
  ADMIN: 'Administración',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  QR: 'QR',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
};

export const CASH_MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
  CASH_IN: 'Ingreso',
  CASH_OUT: 'Egreso',
};

// ==================== FASE 6: SaaS / Planes ====================

export const BillingPeriod = {
  MONTHLY: 'MONTHLY',
  YEARLY: 'YEARLY',
} as const;
export type BillingPeriod = (typeof BillingPeriod)[keyof typeof BillingPeriod];
export const BILLING_PERIOD_VALUES: readonly BillingPeriod[] = Object.values(BillingPeriod);

export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
  TRIALING: 'TRIALING',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
export const SUBSCRIPTION_STATUS_VALUES: readonly SubscriptionStatus[] =
  Object.values(SubscriptionStatus);

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Activa',
  PAST_DUE: 'Vencida',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
  TRIALING: 'Prueba',
};

// ==================== FASE 6: Inventario ====================

export const InventoryMovementType = {
  IN: 'IN',
  OUT: 'OUT',
  INITIAL: 'INITIAL',
} as const;
export type InventoryMovementType =
  (typeof InventoryMovementType)[keyof typeof InventoryMovementType];
export const INVENTORY_MOVEMENT_TYPE_VALUES: readonly InventoryMovementType[] =
  Object.values(InventoryMovementType);

export const InventoryReferenceType = {
  SALE: 'SALE',
  PURCHASE: 'PURCHASE',
  ADJUSTMENT: 'ADJUSTMENT',
  SPOILAGE: 'SPOILAGE',
  INITIAL: 'INITIAL',
} as const;
export type InventoryReferenceType =
  (typeof InventoryReferenceType)[keyof typeof InventoryReferenceType];
export const INVENTORY_REFERENCE_TYPE_VALUES: readonly InventoryReferenceType[] =
  Object.values(InventoryReferenceType);

export const PurchaseStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type PurchaseStatus = (typeof PurchaseStatus)[keyof typeof PurchaseStatus];
export const PURCHASE_STATUS_VALUES: readonly PurchaseStatus[] = Object.values(PurchaseStatus);

export const INVENTORY_MOVEMENT_TYPE_LABELS: Record<InventoryMovementType, string> = {
  IN: 'Entrada',
  OUT: 'Salida',
  INITIAL: 'Stock inicial',
};

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  PENDING: 'Pendiente',
  COMPLETED: 'Completada',
  CANCELLED: 'Anulada',
};

// ==================== FASE 6: Reportes ====================

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
export const REPORT_TYPE_VALUES: readonly ReportType[] = Object.values(ReportType);

export const ReportFormat = {
  PDF: 'PDF',
  XLSX: 'XLSX',
} as const;
export type ReportFormat = (typeof ReportFormat)[keyof typeof ReportFormat];
export const REPORT_FORMAT_VALUES: readonly ReportFormat[] = Object.values(ReportFormat);

export const ReportStatus = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];
export const REPORT_STATUS_VALUES: readonly ReportStatus[] = Object.values(ReportStatus);

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  SALES_DAILY: 'Ventas del día',
  SALES_RANGE: 'Ventas por rango',
  PAYMENT_METHODS: 'Métodos de pago',
  TOP_PRODUCTS: 'Productos más vendidos',
  GROSS_PROFIT: 'Utilidad bruta',
  INVENTORY: 'Inventario',
  CLOSE_REPORT: 'Reporte de cierre',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  COMPLETED: 'Completado',
  FAILED: 'Falló',
};
