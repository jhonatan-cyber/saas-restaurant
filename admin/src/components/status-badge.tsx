import type { ReactNode } from 'react';

interface StatusBadgeProps {
  /** Etiqueta a mostrar (ej. "Libre", "Ocupada", "Activo") */
  label: string;
  /** Variante de color semántica */
  variant: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}

/**
 * Badge de estado pequeño. Usado para status de mesa, isActive, etc.
 * No es un componente ultra-configurable: el objetivo es reusar las
 * 5 variantes más comunes y mantener consistencia visual.
 */
export function StatusBadge({ label, variant }: StatusBadgeProps): ReactNode {
  const styles: Record<StatusBadgeProps['variant'], string> = {
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-700',
    neutral: 'bg-slate-100 text-slate-700',
    info: 'bg-blue-100 text-blue-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}
    >
      {label}
    </span>
  );
}
