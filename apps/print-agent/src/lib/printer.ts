/**
 * Abstracción de impresora.
 * Soporta:
 *  - Network (TCP socket a IP:port, típicamente port 9100)
 *  - File (guarda .bin en disco para debugging)
 *
 * En Windows, la forma más estable para impresoras térmicas es
 * enviar ESC/POS vía TCP a la IP del puerto de red de la impresora
 * (Epson TM utilizza port 9100 por defecto).
 *
 * Para impresoras USB, se puede usar el "Generic / Text Only" driver
 * configurado en el puerto USB, y enviar el raw data al puerto LPT
 * o mediante el driver usando herramientas externas.
 */

import { createConnection } from 'node:net';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export interface PrinterConfig {
  id: string;
  name: string;
  type: 'network' | 'file';
  /** Para network: dirección IP */
  host?: string;
  /** Para network: puerto (default 9100) */
  port?: number;
  /** Para file: directorio de salida */
  outputDir?: string;
  /** Tags opcionales: 'ticket', 'comanda', 'close-report' */
  tags?: string[];
  /** Ancho de papel en mm (58 o 80) */
  paperWidth?: 58 | 80;
}

export type PrintResult = { ok: true; printer: string } | { ok: false; printer: string; error: string };

let printers: PrinterConfig[] = [];

export function setPrinters(cfg: PrinterConfig[]): void {
  printers = cfg;
}

export function getPrinters(): PrinterConfig[] {
  return printers;
}

export function findPrintersByTag(tag: string): PrinterConfig[] {
  return printers.filter((p) => p.tags?.includes(tag));
}

/**
 * Envía datos ESC/POS a una impresora.
 * Para network: conexión TCP, envía buffer, espera respuesta, cierra.
 * Para file: escribe .bin con timestamp.
 */
export async function printToPrinter(
  printer: PrinterConfig,
  data: Uint8Array,
  nameHint = 'print',
): Promise<PrintResult> {
  switch (printer.type) {
    case 'network':
      return printNetwork(printer, data);
    case 'file':
      return printFile(printer, data, nameHint);
    default:
      return { ok: false, printer: printer.name, error: `Tipo no soportado: ${printer.type}` };
  }
}

async function printNetwork(printer: PrinterConfig, data: Uint8Array): Promise<PrintResult> {
  const host = printer.host;
  const port = printer.port ?? 9100;
  if (!host) {
    return { ok: false, printer: printer.name, error: 'Falta host en configuración network' };
  }

  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: 5000 }, () => {
      socket.write(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
    });

    socket.on('error', (err) => {
      socket.destroy();
      resolve({ ok: false, printer: printer.name, error: err.message });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ ok: false, printer: printer.name, error: 'Timeout de conexión' });
    });

    socket.on('close', () => {
      resolve({ ok: true, printer: printer.name });
    });

    // Timeout global
    setTimeout(() => {
      if (!socket.destroyed) {
        socket.destroy();
        resolve({ ok: false, printer: printer.name, error: 'Timeout global (10s)' });
      }
    }, 10000);
  });
}

async function printFile(printer: PrinterConfig, data: Uint8Array, nameHint: string): Promise<PrintResult> {
  const dir = printer.outputDir ?? resolve(import.meta.dir, '../../prints');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${nameHint}-${ts}.bin`;
  const path = resolve(dir, filename);
  writeFileSync(path, Buffer.from(data.buffer, data.byteOffset, data.byteLength));
  return { ok: true, printer: `${printer.name} (file: ${filename})` };
}
