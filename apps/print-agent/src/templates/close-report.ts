import * as escpos from '../escpos';

interface CloseReportData {
  businessName: string;
  branchName: string;
  cashRegisterCode: string;
  cashierName: string;
  openedAt: string;
  closedAt: string;
  openingAmount: string;
  paymentsByMethod: Array<{ method: string; count: number; total: string }>;
  cashMovementsIn: Array<{ category: string; amount: string }>;
  cashMovementsOut: Array<{ category: string; amount: string }>;
  expectedAmount: string;
  closingAmount: string;
  difference: string;
}

const W = escpos.PM;

/**
 * Reporte de cierre de caja.
 * - Apertura
 * - Desglose de pagos por método
 * - Movimientos de caja (ingresos/egresos)
 * - Cálculo de arqueo
 * - Firma del cajero
 */
export function buildCloseReport(d: CloseReportData): Uint8Array {
  const parts: Uint8Array[] = [
    escpos.init(),
    escpos.align(1),
    escpos.printMode(W.BOLD | W.DOUBLE_WIDTH),
    escpos.centerText(d.businessName),
    escpos.lf(),
    escpos.printMode(W.DOUBLE_HEIGHT | W.BOLD),
    escpos.centerText('CIERRE DE CAJA'),
    escpos.lf(),

    escpos.align(0),
    escpos.printMode(W.FONT_B),
    escpos.leftText(`Sucursal: ${d.branchName}`),
    escpos.leftText(`Caja: ${d.cashRegisterCode}`),
    escpos.leftText(`Cajero: ${d.cashierName}`),
    escpos.leftText(`Apertura: ${d.openedAt}`),
    escpos.leftText(`Cierre: ${d.closedAt}`),
    escpos.line(),

    // Apertura
    escpos.printMode(W.BOLD),
    escpos.leftText('APERTURA'),
    escpos.printMode(0),
    escpos.twoCol('Monto inicial', `Bs ${d.openingAmount}`),
    escpos.lf(),

    // Ventas (pagos por método)
    escpos.printMode(W.BOLD),
    escpos.leftText('VENTAS DEL TURNO'),
    escpos.printMode(0),
    ...d.paymentsByMethod.map((p) =>
      escpos.concat(
        escpos.twoCol(p.method, `Bs ${p.total}`),
        escpos.twoCol('  Cantidad', `${p.count} venta(s)`),
        escpos.lf(0),
      ),
    ),
    escpos.dashLine(),
  ];

  // Ingresos de caja
  if (d.cashMovementsIn.length > 0) {
    parts.push(
      escpos.printMode(W.BOLD),
      escpos.leftText('INGRESOS (no ventas)'),
      escpos.printMode(0),
      ...d.cashMovementsIn.map((m) => escpos.twoCol(m.category, `Bs ${m.amount}`)),
      escpos.dashLine(),
    );
  }

  // Egresos de caja
  if (d.cashMovementsOut.length > 0) {
    parts.push(
      escpos.printMode(W.BOLD),
      escpos.leftText('EGRESOS'),
      escpos.printMode(0),
      ...d.cashMovementsOut.map((m) => escpos.twoCol(m.category, `Bs ${m.amount}`)),
      escpos.dashLine(),
    );
  }

  // Arqueo
  parts.push(
    escpos.lf(),
    escpos.printMode(W.BOLD),
    escpos.leftText('ARQUEO'),
    escpos.printMode(0),
    escpos.twoCol('Esperado', `Bs ${d.expectedAmount}`),
    escpos.twoCol('Real', `Bs ${d.closingAmount}`),
    escpos.line(),
    escpos.align(1),
  );

  const diff = Number(d.difference);
  if (diff === 0) {
    parts.push(
      escpos.printMode(W.DOUBLE_HEIGHT | W.BOLD),
      escpos.centerText('✅ CUADRADO'),
    );
  } else {
    parts.push(
      escpos.printMode(W.QUAD | W.BOLD),
      escpos.centerText(diff > 0 ? '⚠️ SOBRANTE' : '⚠️ FALTANTE'),
      escpos.lf(),
      escpos.printMode(W.DOUBLE_HEIGHT | W.BOLD),
      escpos.centerText(`Bs ${d.difference}`),
    );
  }

  // Footer
  parts.push(
    escpos.printMode(W.FONT_B),
    escpos.lf(2),
    escpos.align(0),
    escpos.leftText('Firma del cajero: ______________________'),
    escpos.lf(2),
    escpos.leftText('Firma del supervisor: _________________'),
    escpos.lf(2),
    escpos.align(1),
    escpos.leftText('Sistema SaaS Restaurant'),
    escpos.lf(2),
    escpos.cut(1),
  );

  return escpos.concat(...parts);
}
