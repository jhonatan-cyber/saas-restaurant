/**
 * Iconos SVG inline usados en el Dashboard.
 * Los iconos compartidos con el layout principal se re-exportan
 * desde '../icons' para evitar duplicación de SVG.
 */
import type { ReactNode } from 'react';

interface IconProps {
  className?: string;
}

// ── Re-export desde el archivo de iconos general ─────────────────────────

export {
  BoxIcon,
  TagIcon,
  UsersIcon,
  TableIcon,
  ReceiptIcon,
  TruckIcon,
  BranchIcon,
  FireIcon,
  PackageIcon,
  ChevronDownSolidIcon,
  PlusIcon,
  GridIcon,
} from '../icons';

// ── Iconos específicos del Dashboard (no compartidos) ────────────────────

export function CurrencyIcon({ className = 'h-5 w-5' }: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <circle cx="12" cy="12" r="8"/>
      <path d="M15 9h-4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4"/>
      <line x1="10" y1="7" x2="10" y2="17"/>
    </svg>
  );
}

export function ClockIcon({ className = 'h-5 w-5' }: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

export function CrownIcon({ className = 'h-5 w-5' }: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M12 2l3 5 5.5-1.5L19 10l4 4-6 2-2 6-2-6-6-2 4-4-1.5-6.5L9 7z"/>
    </svg>
  );
}

export function AlertIcon({ className = 'h-5 w-5' }: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  );
}

export function ArrowRightIcon({ className = 'h-4 w-4' }: IconProps): ReactNode {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10z" clipRule="evenodd"/>
    </svg>
  );
}
