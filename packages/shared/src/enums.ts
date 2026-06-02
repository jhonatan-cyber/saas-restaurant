/**
 * Enums compartidos entre backend y frontend.
 * Mantener sincronizados con el schema de Prisma (apps/api/prisma/schema.prisma).
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
