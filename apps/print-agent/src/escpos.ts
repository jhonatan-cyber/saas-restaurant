/**
 * Constructor de comandos ESC/POS crudos.
 * Cada método retorna un Uint8Array que se concatenan para formar
 * el documento de impresión completo.
 *
 * Referencia: EPSON ESC/POS Application Programming Guide
 */

// ==================== COMANDOS BASE ====================

/** Inicializa la impresora (limpia buffers, reset de configuración) */
export function init(): Uint8Array {
  return new Uint8Array([0x1b, 0x40]); // ESC @
}

/** Avance de línea */
export function lf(n = 1): Uint8Array {
  return new Uint8Array(n).fill(0x0a);
}

/** Alineación: 0=izq, 1=centro, 2=der */
export function align(n: 0 | 1 | 2): Uint8Array {
  return new Uint8Array([0x1b, 0x61, n]); // ESC a n
}

/** Modo de impresión (bold, height, width combinados como bitmask) */
export function printMode(mask: number): Uint8Array {
  return new Uint8Array([0x1b, 0x21, mask]); // ESC ! n
}

// Bitmask helpers para printMode
export const PM = {
  FONT_B: 0x01,
  BOLD: 0x08,
  DOUBLE_HEIGHT: 0x10,
  DOUBLE_WIDTH: 0x20,
  /** Quad = doble alto + doble ancho */
  QUAD: 0x30,
} as const;

/** Subrayado: 0=none, 1=thin, 2=thick */
export function underline(n: 0 | 1 | 2): Uint8Array {
  return new Uint8Array([0x1b, 0x2d, n]); // ESC - n
}

/** Corta el papel: 0=corte completo, 1=corte parcial */
export function cut(n: 0 | 1 = 0): Uint8Array {
  return new Uint8Array([0x1d, 0x56, n]); // GS V n
}

/** Feed n líneas */
export function feed(n: number): Uint8Array {
  return new Uint8Array([0x1b, 0x64, n]); // ESC d n
}

// ==================== TEXTO CODIFICADO ====================

/** Codifica texto a CP437 (latin-1 extendido para impresora térmica) */
function encodeText(text: string): Uint8Array {
  // CP437 / latin-1: los chars 0-255 pasan directo.
  // Para ñ/Ñ/tildes mapeamos a chars aproximados de CP437.
  const table: Record<string, number> = {
    'ñ': 0xa4, 'Ñ': 0xa5,
    'á': 0xa0, 'Á': 0xb5,
    'é': 0x82, 'É': 0x90,
    'í': 0xa1, 'Í': 0xd6,
    'ó': 0xa2, 'Ó': 0xe0,
    'ú': 0xa3, 'Ú': 0xe9,
    'ü': 0x81, 'Ü': 0x9a,
    '¡': 0xa8, '¿': 0xa8,
  };
  const bytes = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const cp = table[ch] ?? ch.charCodeAt(0);
    bytes[i] = cp >= 256 ? 0x3f : cp; // fallback a '?'
  }
  return bytes;
}

// ==================== LÍNEAS FORMATEADAS ====================

const LINE_WIDTH = 42; // chars en font normal para papel 80mm

/** Línea separadora */
export function line(char = '='): Uint8Array {
  return concat(encodeText(char.repeat(LINE_WIDTH)), lf());
}

/** Línea punteada */
export function dashLine(char = '-'): Uint8Array {
  return concat(encodeText(char.repeat(LINE_WIDTH)), lf());
}

/** Texto centrado */
export function centerText(text: string): Uint8Array {
  const pad = Math.max(0, Math.floor((LINE_WIDTH - text.length) / 2));
  return concat(encodeText(' '.repeat(pad) + text), lf());
}

/** Texto alineado a la izquierda */
export function leftText(text: string): Uint8Array {
  // Si es más largo que el ancho, truncamos
  const truncated = text.length > LINE_WIDTH ? text.slice(0, LINE_WIDTH) : text;
  return concat(encodeText(truncated), lf());
}

/** Dos columnas: label (izq) + value (der), separadas por espacios */
export function twoCol(label: string, value: string, valueWidth = 14): Uint8Array {
  const maxLabel = LINE_WIDTH - valueWidth - 1;
  const lbl = label.length > maxLabel ? label.slice(0, maxLabel) : label;
  const val = value.padStart(valueWidth);
  return concat(encodeText(`${lbl}${val}`), lf());
}

/** Fila de producto para ticket: nombre + qty + total */
export function productRow(
  name: string,
  qty: number,
  total: string,
  notes?: string,
): Uint8Array {
  const left = `${qty}× ${name}`;
  const maxLeft = Math.min(LINE_WIDTH - 12, left.length);
  const display = left.slice(0, maxLeft).padEnd(maxLeft);
  const combined = `${display}${' '.repeat(LINE_WIDTH - maxLeft - 14)}${total.padStart(14)}`;
  const buf = concat(encodeText(combined), lf());
  if (notes) {
    const note = `  (${notes})`;
    const truncated = note.length > LINE_WIDTH ? note.slice(0, LINE_WIDTH) : note;
    return concat(buf, encodeText(truncated), lf());
  }
  return buf;
}

/** Fila de producto **sin precio** para comanda de cocina */
export function comandaProductRow(
  name: string,
  qty: number,
  notes?: string,
): Uint8Array {
  const left = `${qty}× ${name}`;
  const truncated = left.length > LINE_WIDTH ? left.slice(0, LINE_WIDTH) : left;
  const buf = concat(encodeText(truncated), lf());
  if (notes) {
    const note = `  📝 ${notes}`;
    const truncatedNote = note.length > LINE_WIDTH ? note.slice(0, LINE_WIDTH) : note;
    return concat(buf, encodeText(truncatedNote), lf());
  }
  return buf;
}

// ==================== HELPERS ====================

export function concat(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/** Convierte Uint8Array a Buffer (para enviar por socket) */
export function toBuffer(data: Uint8Array): Buffer {
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
}
