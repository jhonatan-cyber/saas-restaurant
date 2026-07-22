import * as escpos from '../escpos';

interface ComandaItem {
  name: string;
  qty: number;
  notes?: string;
  preparationAreaName?: string;
  /** Items incluidos en un combo (F5-01) */
  subItems?: Array<{ name: string; qty: number }>;
}

interface ComandaData {
  businessName: string;
  branchName: string;
  orderCode: string;
  tableNumber?: string;
  waiterName?: string;
  areaName: string; // "COCINA" | "BAR" | "COFFEE" etc.
  items: ComandaItem[];
  globalNotes?: string;
  createdAt: string;
  priority?: 'NORMAL' | 'URGENTE';
}

const W = escpos.PM;

/**
 * Comanda de cocina (SIN precios).
 * - Encabezado: negocio, mesa, mozo, hora
 * - Items con preparación (qty × name + notas)
 * - Sin precios (D7-F5)
 * - Corta y va a la cocina
 */
export function buildComanda(d: ComandaData): Uint8Array {
  return escpos.concat(
    escpos.init(),
    escpos.align(1),
    escpos.printMode(W.BOLD | W.DOUBLE_HEIGHT),
    d.priority === 'URGENTE'
      ? escpos.concat(
          escpos.printMode(W.QUAD | W.BOLD),
          escpos.centerText('⚠️ URGENTE ⚠️'),
          escpos.lf(),
          escpos.printMode(W.BOLD | W.DOUBLE_HEIGHT),
        )
      : escpos.lf(0),
    escpos.centerText(`${d.businessName} — ${d.branchName}`),
    escpos.lf(),

    escpos.align(0),
    escpos.printMode(W.BOLD | W.DOUBLE_WIDTH),
    escpos.centerText(`=== ${d.areaName} ===`),
    escpos.printMode(0),
    escpos.lf(),

    escpos.twoCol('Orden', `#${d.orderCode}`),
    d.tableNumber ? escpos.twoCol('Mesa', d.tableNumber) : escpos.lf(0),
    d.waiterName ? escpos.twoCol('Mesero', d.waiterName) : escpos.lf(0),
    escpos.twoCol('Hora', d.createdAt),
    escpos.line(),

    // Items (sin precio)
    escpos.align(0),
    escpos.printMode(W.BOLD),
    escpos.leftText('PRODUCTO'),
    escpos.printMode(0),
    escpos.dashLine(),
    ...d.items.flatMap((it) => {
      const row = escpos.comandaProductRow(it.name, it.qty, it.notes);
      if (it.subItems && it.subItems.length > 0) {
        const subRows = it.subItems.map((sub) => escpos.subProductRow(sub.name, sub.qty));
        return [row, ...subRows];
      }
      return [row];
    }),

    // Notas globales
    d.globalNotes
      ? escpos.concat(escpos.line(), escpos.leftText(`📝 ${d.globalNotes}`), escpos.lf())
      : escpos.lf(0),

    // Separador final
    escpos.line(),
    escpos.align(1),
    escpos.leftText('Comanda generada automáticamente'),
    escpos.lf(2),
    escpos.cut(1),
  );
}
