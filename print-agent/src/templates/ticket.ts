import * as escpos from '../escpos';

interface TicketLineItem {
  name: string;
  qty: number;
  total: string;
  notes?: string;
  /** Items incluidos en un combo (F5-01) */
  subItems?: Array<{ name: string; qty: number }>;
}

interface TicketData {
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  ruc?: string;
  branchName: string;
  orderCode: string; // últimos 8 chars del ID
  tableNumber?: string;
  cashierName: string;
  items: TicketLineItem[];
  subtotal: string;
  taxTotal: string;
  total: string;
  payments: Array<{
    method: string;
    amount: string;
    change?: string;
  }>;
  changeTotal?: string;
  createdAt: string;
  footer?: string;
}

const W = escpos.PM;

/**
 * Ticket de venta (formato 80mm).
 * - Header con datos del negocio
 * - Detalle de items (qty × name — price — total)
 * - Totales
 * - Desglose de pagos
 * - Footer
 */
export function buildTicket(d: TicketData): Uint8Array {
  return escpos.concat(
    escpos.init(),
    escpos.align(1),
    escpos.printMode(W.BOLD | W.DOUBLE_WIDTH),
    escpos.encodeText(d.businessName),
    escpos.lf(),
    escpos.printMode(W.FONT_B),
    escpos.align(0),
    escpos.leftText(`Orden: #${d.orderCode}`),
    escpos.leftText(`Sucursal: ${d.branchName}`),
    d.tableNumber ? escpos.leftText(`Mesa: ${d.tableNumber}`) : escpos.lf(0),
    escpos.leftText(`Cajero: ${d.cashierName}`),
    escpos.leftText(`Fecha: ${d.createdAt}`),
    d.ruc ? escpos.leftText(`RUC: ${d.ruc}`) : escpos.lf(0),
    escpos.line(),

    // Items
    escpos.align(0),
    escpos.printMode(W.BOLD),
    escpos.twoCol('PRODUCTO', 'TOTAL', 12),
    escpos.printMode(0),
    escpos.dashLine(),
    ...d.items.flatMap((it) => {
      const row = escpos.productRow(it.name, it.qty, it.total, it.notes);
      if (it.subItems && it.subItems.length > 0) {
        const subRows = it.subItems.map((sub) => escpos.ticketSubRow(sub.name, sub.qty));
        return [row, ...subRows];
      }
      return [row];
    }),

    // Totales
    escpos.dashLine(),
    escpos.twoCol('Subtotal', `Bs ${d.subtotal}`),
    escpos.twoCol('Impuestos', `Bs ${d.taxTotal}`),
    escpos.line(),
    escpos.align(1),
    escpos.printMode(W.DOUBLE_HEIGHT | W.BOLD),
    escpos.centerText(`TOTAL: Bs ${d.total}`),
    escpos.printMode(W.FONT_B),
    escpos.lf(),

    // Detalle de pagos
    escpos.align(0),
    escpos.printMode(W.BOLD),
    escpos.leftText('PAGOS'),
    escpos.printMode(0),
    ...d.payments.map((p) => {
      if (p.change) {
        return escpos.concat(
          escpos.twoCol(p.method, `Bs ${p.amount}`),
          escpos.twoCol('  Entrega', `Bs ${p.change}`),
          escpos.lf(0),
        );
      }
      return escpos.twoCol(p.method, `Bs ${p.amount}`);
    }),
    escpos.lf(),

    // Footer
    escpos.align(1),
    escpos.leftText(d.footer ?? '¡Gracias por su compra!'),
    escpos.lf(2),
    escpos.cut(1),
  );
}
