/**
 * Esquemas Zod para validación de formularios del frontend.
 * Re-exportamos los del paquete @saas/shared y añadimos defaults visuales
 * cuando sea necesario.
 */
import { z } from '@saas/shared';
import { loginSchema as sharedLoginSchema } from '@saas/shared';

// Login: usa el shared + un default "demo" para businessSlug
export const loginFormSchema = sharedLoginSchema;
export type LoginFormValues = {
  email: string;
  password: string;
  businessSlug: string;
};

export const loginFormDefaults: Partial<LoginFormValues> = {
  businessSlug: 'demo',
};

// =================== Categories ===================

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  slug: z
    .string()
    .trim()
    .min(1, 'El slug es obligatorio')
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  description: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
  imageUrl: z
    .url('URL inválida')
    .optional()
    .or(z.literal('').transform(() => undefined as string | undefined)),
  displayOrder: z.number().int().min(0),
  branchId: z.string().optional().or(z.literal('').transform(() => undefined)),
  isActive: z.boolean(),
});
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// =================== Branches ===================

export const branchFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'El código es obligatorio')
    .max(20)
    .regex(/^[A-Z0-9_-]+$/, 'Solo mayúsculas, números, guion y guion bajo'),
  address: z.string().trim().max(255).optional().or(z.literal('').transform(() => undefined)),
  phone: z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined)),
  isMain: z.boolean(),
});
export type BranchFormValues = z.infer<typeof branchFormSchema>;

// =================== Suppliers ===================

export const supplierFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  contactName: z.string().trim().max(120).optional().or(z.literal('').transform(() => undefined)),
  email: z
    .email('Email inválido')
    .max(160)
    .optional()
    .or(z.literal('').transform(() => undefined as string | undefined)),
  phone: z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined)),
  address: z.string().trim().max(255).optional().or(z.literal('').transform(() => undefined)),
  taxId: z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined)),
  notes: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
  isActive: z.boolean(),
  branchId: z.string().optional().or(z.literal('').transform(() => undefined)),
});
export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

// =================== Products ===================

export const productFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  slug: z
    .string()
    .trim()
    .min(1, 'El slug es obligatorio')
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  imageUrl: z
    .url('URL inválida')
    .optional()
    .or(z.literal('').transform(() => undefined as string | undefined)),
  categoryId: z.string().optional().or(z.literal('').transform(() => undefined)),
  preparationAreaId: z.string().optional().or(z.literal('').transform(() => undefined)),
  branchId: z.string().optional().or(z.literal('').transform(() => undefined)),
  sku: z.string().trim().max(64).optional().or(z.literal('').transform(() => undefined)),
  price: z.number().nonnegative('El precio no puede ser negativo'),
  cost: z.number().nonnegative().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  trackStock: z.boolean(),
  minStock: z.number().int().nonnegative().optional(),
  productType: z.enum(['SALE', 'COMBO', 'ADDON', 'SERVICE', 'INGREDIENT']),
  comboItems: z
    .array(
      z.object({
        productId: z.string().min(1, 'Producto requerido'),
        productName: z.string().min(1, 'Nombre requerido'),
        quantity: z.number().int().min(1, 'Cantidad mínima 1').max(999),
      }),
    )
    .optional(),
  bulkPricing: z
    .array(
      z.object({
        minQty: z.number().int().min(2, 'Mínimo 2 unidades'),
        unitPrice: z.number().nonnegative('Precio no puede ser negativo'),
      }),
    )
    .optional(),
  preparationTimeMin: z.number().int().min(0).max(600).optional(),
  isActive: z.boolean(),
  isAvailable: z.boolean(),
});
export type ProductFormValues = z.infer<typeof productFormSchema>;

// =================== Preparation Areas ===================

export const preparationAreaFormSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'El código es obligatorio')
    .max(16)
    .regex(/^[A-Z0-9_-]+$/, 'Solo mayúsculas, números, guion y guion bajo'),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  branchId: z.string().optional().or(z.literal('').transform(() => undefined)),
  displayOrder: z.number().int().min(0),
  isActive: z.boolean(),
});
export type PreparationAreaFormValues = z.infer<typeof preparationAreaFormSchema>;

// =================== Tables ===================

export const tableFormSchema = z.object({
  branchId: z.string().min(1, 'La sucursal es obligatoria'),
  number: z.string().trim().min(1, 'El número es obligatorio').max(16),
  capacity: z.number().int().min(1, 'Mínimo 1').max(50),
  location: z.enum(['INDOOR', 'OUTDOOR', 'BAR', 'PATIO', 'TERRACE', 'OTHER']),
  displayOrder: z.number().int().min(0),
  notes: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
  posX: z.number().int().min(0).optional(),
  posY: z.number().int().min(0).optional(),
});
export type TableFormValues = z.infer<typeof tableFormSchema>;

// =================== Customers ===================

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  taxId: z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined)),
  taxIdType: z.string().trim().max(16).optional().or(z.literal('').transform(() => undefined)),
  email: z
    .email('Email inválido')
    .max(160)
    .optional()
    .or(z.literal('').transform(() => undefined as string | undefined)),
  phone: z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined)),
  address: z.string().trim().max(255).optional().or(z.literal('').transform(() => undefined)),
  addressReference: z
    .string()
    .trim()
    .max(255)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal('').transform(() => undefined)),
  isActive: z.boolean(),
});
export type CustomerFormValues = z.infer<typeof customerFormSchema>;

// =================== Business Settings ===================

export const businessFormSchema = z.object({
  name: z.string().trim().min(1, 'El nombre es obligatorio').max(160),
  legalName: z.string().trim().max(160).optional().or(z.literal('').transform(() => undefined)),
  taxId: z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined)),
  email: z.string().trim().min(1, 'El email es obligatorio').email('Email inválido').max(160),
  phone: z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined)),
  currency: z.string().trim().min(1, 'La moneda es obligatoria'),
  timezone: z.string().trim().min(1, 'La zona horaria es obligatoria'),
  moduleReports: z.boolean(),
  moduleInventory: z.boolean(),
  modulePosStations: z.boolean(),
  moduleDeliveryApp: z.boolean(),
});
export type BusinessFormValues = z.infer<typeof businessFormSchema>;

export const businessFormDefaults: BusinessFormValues = {
  name: '',
  legalName: undefined as unknown as string,
  taxId: undefined as unknown as string,
  email: '',
  phone: undefined as unknown as string,
  currency: 'BOB',
  timezone: 'America/La_Paz',
  moduleReports: false,
  moduleInventory: false,
  modulePosStations: false,
  moduleDeliveryApp: false,
};
