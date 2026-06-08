import { Prisma } from '@prisma/client';

/**
 * Mapper utilities for DTO transformations.
 *
 * Centralizes repetitive transformations (Date→ISO string, Decimal→string)
 * to reduce boilerplate across all entity mappers.
 */

/** Convert a Date to ISO string. */
export function dateToString(d: Date): string {
  return d.toISOString();
}

/** Convert a nullable Date to ISO string, returning null for null/undefined. */
export function dateToNull(d: Date | null | undefined): string | null {
  if (d == null) return null;
  return d.toISOString();
}

/** Convert a Prisma.Decimal to string. */
export function decToString(d: Prisma.Decimal | string | number): string {
  if (typeof d === 'string') return d;
  if (typeof d === 'number') return new Prisma.Decimal(d).toString();
  return d.toString();
}

/** Convert a nullable Prisma.Decimal to string, returning null for null/undefined. */
export function decToNull(d: Prisma.Decimal | null | undefined): string | null {
  if (d == null) return null;
  return d.toString();
}
