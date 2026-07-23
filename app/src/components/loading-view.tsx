import type { ReactNode } from 'react';
import { OrbSpinner } from '@saas/ui';

interface LoadingViewProps {
  /** Mensaje opcional (default: "Cargando…") */
  message?: string;
  /** Variante visual: card (dentro de un contenedor) o full (pantalla completa) */
  variant?: 'card' | 'full' | 'inline';
  /** Clases adicionales */
  className?: string;
}

/**
 * Componente de estado de carga.
 *
 * Variantes:
 * - `card`: un recuadro tipo card centrado con spinner y texto (default, ideal tablas/listas)
 * - `full`: pantalla completa centrada (ideal para páginas enteras)
 * - `inline`: solo texto sin padding extra (ideal para reemplazar un <span>)
 */
export function LoadingView({
  message = 'Cargando…',
  variant = 'card',
  className = '',
}: LoadingViewProps): ReactNode {
  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-2 text-sm text-slate-500 ${className}`}>
        <Spinner className="h-4 w-4" />
        {message}
      </span>
    );
  }

  const container = variant === 'full'
    ? 'flex min-h-[60vh] items-center justify-center'
    : 'card p-8 text-center';

  return (
    <div className={`${container} ${className}`}>
      <div className="flex flex-col items-center gap-3">
        <Spinner className="h-6 w-6" />
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}

/* Spinner unificado — usa thinking-orbs */
function Spinner({ className }: { className: string }): ReactNode {
  return <OrbSpinner size={20} state="working" speed={3.00} className={className} />;
}
