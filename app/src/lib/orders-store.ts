import { create } from 'zustand';
import type { OrderType, OrderChannel } from '@saas/shared';

/**
 * Cart efímero (DRAFT-only) para la pantalla POS.
 *
 * Reglas de negocio (D3=A):
 *  - NO se persiste en backend. El backend solo ve órdenes a partir de PENDING.
 *  - NO se persiste en localStorage: si el cajero recarga, el cart se vacía.
 *    Esto es intencional: una orden no confirmada es descartable.
 *  - El snapshot (productName, unitPrice, etc.) se congela al momento de
 *    AGREGAR el ítem al cart. Si el admin edita un producto, el cart no se
 *    entera hasta que se reabra la pantalla y se vuelva a agregar.
 *
 * Por qué Zustand y no useState: el cart se comparte entre ProductGrid
 * (agrega) y OrderCartPanel (muestra/edita/limpia) sin prop drilling.
 */
export interface CartItem {
  productId: string;
  productName: string;
  /** Decimal como string (viene del ProductDTO). */
  unitPrice: string;
  taxRate: string | null;
  preparationAreaId: string | null;
  preparationAreaName: string | null;
  quantity: number;
  notes: string | null;
}

interface OrdersCartState {
  items: CartItem[];
  tableId: string | null;
  tableNumber: string | null;
  customerId: string | null;
  customerName: string | null;
  type: OrderType;
  channel: OrderChannel;
  globalNotes: string;

  // Context setters
  setTable: (tableId: string | null, tableNumber: string | null) => void;
  setCustomer: (customerId: string | null, customerName: string | null) => void;
  setType: (type: OrderType) => void;
  setChannel: (channel: OrderChannel) => void;
  setGlobalNotes: (notes: string) => void;

  // Cart mutators
  addItem: (item: Omit<CartItem, 'quantity' | 'notes'> & { quantity?: number; notes?: string | null }) => void;
  updateQty: (productId: string, quantity: number) => void;
  updateNotes: (productId: string, notes: string | null) => void;
  removeItem: (productId: string) => void;
  clear: () => void;
}

const initialState = {
  items: [] as CartItem[],
  tableId: null as string | null,
  tableNumber: null as string | null,
  customerId: null as string | null,
  customerName: null as string | null,
  type: 'DINE_IN' as OrderType,
  channel: 'POS_WEB' as OrderChannel,
  globalNotes: '',
};

export const useOrdersCartStore = create<OrdersCartState>((set) => ({
  ...initialState,

  setTable: (tableId, tableNumber) => set({ tableId, tableNumber }),
  setCustomer: (customerId, customerName) => set({ customerId, customerName }),
  setType: (type) => set({ type }),
  setChannel: (channel) => set({ channel }),
  setGlobalNotes: (globalNotes) => set({ globalNotes }),

  addItem: (item) =>
    set((s) => {
      const existing = s.items.find((i) => i.productId === item.productId);
      const addQty = item.quantity ?? 1;
      if (existing) {
        return {
          items: s.items.map((i) =>
            i.productId === item.productId ? { ...i, quantity: i.quantity + addQty } : i,
          ),
        };
      }
      return {
        items: [
          ...s.items,
          {
            productId: item.productId,
            productName: item.productName,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            preparationAreaId: item.preparationAreaId,
            preparationAreaName: item.preparationAreaName,
            quantity: addQty,
            notes: item.notes ?? null,
          },
        ],
      };
    }),

  updateQty: (productId, quantity) =>
    set((s) => {
      if (quantity <= 0) {
        return { items: s.items.filter((i) => i.productId !== productId) };
      }
      return {
        items: s.items.map((i) => (i.productId === productId ? { ...i, quantity } : i)),
      };
    }),

  updateNotes: (productId, notes) =>
    set((s) => ({
      items: s.items.map((i) => (i.productId === productId ? { ...i, notes } : i)),
    })),

  removeItem: (productId) =>
    set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),

  clear: () => set({ ...initialState }),
}));

// ============== Computed helpers (puros, exportados) ==============

/**
 * Subtotal: suma de (unitPrice * quantity) sin impuestos.
 * Devuelve number para display. Para precisión decimal usar Prisma.Decimal
 * (que acá no tenemos). Como esto es SOLO display (el backend recalcula
 * con Decimal real), number es aceptable.
 */
export function computeSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
}

/**
 * Impuestos: suma de (unitPrice * quantity * taxRate/100).
 * Items sin taxRate no aportan.
 */
export function computeTax(items: CartItem[]): number {
  return items.reduce((sum, i) => {
    if (!i.taxRate) return sum;
    return sum + Number(i.unitPrice) * i.quantity * (Number(i.taxRate) / 100);
  }, 0);
}

export function computeTotal(items: CartItem[]): number {
  return computeSubtotal(items) + computeTax(items);
}

export function formatMoney(n: number): string {
  return n.toFixed(2);
}

export function cartItemCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
