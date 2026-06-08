import type { ReactNode } from 'react';

interface EmptyViewProps {
  /** Título principal (default: "Sin datos") */
  title?: string;
  /** Descripción opcional */
  description?: string;
  /** Acción opcional (ej. botón "Crear primero") */
  action?: ReactNode;
  /** Icono personalizado (default: 📦) */
  icon?: ReactNode;
  /** Variante visual */
  variant?: 'card' | 'full' | 'inline';
  /** Clases adicionales */
  className?: string;
}

/**
 * Componente de estado vacío (cuando no hay datos que mostrar).
 *
 * Variantes:
 * - `card`: recuadro tipo card centrado con icono (default)
 * - `full`: pantalla completa (ideal para tablas vacías)
 * - `inline`: solo texto sin padding
 */
export function EmptyView({
  title = 'Sin datos',
  description,
  action,
  icon,
  variant = 'card',
  className = '',
}: EmptyViewProps): ReactNode {
  if (variant === 'inline') {
    return (
      <p className={`text-sm text-slate-400 ${className}`}>{title}</p>
    );
  }

  const container = variant === 'full'
    ? 'flex min-h-[60vh] items-center justify-center px-4'
    : 'card p-8 text-center';

  return (
    <div className={`${container} ${className}`}>
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        {icon ?? (
          <span className="text-4xl" role="img" aria-label="empty">
            📦
          </span>
        )}
        <div>
          <p className="text-sm font-semibold text-slate-600">{title}</p>
          {description && (
            <p className="mt-1 text-xs text-slate-400">{description}</p>
          )}
        </div>
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  );
}
