/**
 * Helpers de fecha/hora centralizados con date-fns.
 *
 * Siempre usar estas funciones en vez de new Date().toLocaleString() directo.
 * Esto garantiza consistencia de formato en toda la app y facilita
 * cambiar el locale sin tocar cada archivo.
 */
import {
  format,
  formatDistanceToNow,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  parse,
} from 'date-fns';
import { es } from 'date-fns/locale';

// Locale por defecto para formato argentino
const LOCALE = es;

/**
 * Convierte string ISO a Date. Retorna null si es inválido.
 */
export function parseDate(isoString: string | null | undefined): Date | null {
  if (!isoString) return null;
  const d = parseISO(isoString);
  return isValid(d) ? d : null;
}

/**
 * Formato corto: "27 jun 2026"
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!d) return '—';
  return format(d, 'd MMM yyyy', { locale: LOCALE });
}

/**
 * Formato largo con hora: "27 jun 2026, 14:30"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!d) return '—';
  return format(d, "d MMM yyyy, HH:mm", { locale: LOCALE });
}

/**
 * Solo hora: "14:30"
 */
export function formatTime(date: string | Date | null | undefined): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!d) return '—';
  return format(d, 'HH:mm');
}

/**
 * Solo fecha: "27/06/2026"
 */
export function formatDateISO(date: string | Date | null | undefined): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!d) return '—';
  return format(d, 'dd/MM/yyyy');
}

/**
 * Para inputs de tipo date (value de <input type="date" />): "2026-06-27"
 */
export function toDateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Rango de fecha para el día actual (inicio 00:00 hasta fin 23:59:59)
 */
export function todayRange(): { from: string; to: string } {
  const now = new Date();
  return {
    from: startOfDay(now).toISOString(),
    to: endOfDay(now).toISOString(),
  };
}

/**
 * Rango del mes actual
 */
export function currentMonthRange(): { from: string; to: string } {
  const now = new Date();
  return {
    from: startOfMonth(now).toISOString(),
    to: endOfMonth(now).toISOString(),
  };
}

/**
 * "hace 5 minutos", "hace 2 días"
 */
export function formatRelative(date: string | Date | null | undefined): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!d) return '—';
  return formatDistanceToNow(d, { addSuffix: true, locale: LOCALE });
}

/**
 * Día siguiente / anterior (para navegación en reportes)
 */
export function tomorrow(date: Date): Date {
  return addDays(date, 1);
}
export function yesterday(date: Date): Date {
  return subDays(date, 1);
}

/**
 * Parsea string de input date (yyyy-MM-dd) a Date
 */
export function parseInputDate(value: string): Date | null {
  if (!value) return null;
  const d = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(d) ? d : null;
}

/**
 * Para reportes: formato "Junio 2026"
 */
export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: LOCALE });
}