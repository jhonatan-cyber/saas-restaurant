import type { ReactNode } from 'react';

interface ErrorViewProps {
  /** Mensaje principal (default: "Ocurrió un error") */
  title?: string;
  /** Mensaje secundario opcional (ej. detalle técnico) */
  message?: string;
  /** Callback opcional para botón de reintentar */
  onRetry?: () => void;
  /** Texto del botón reintentar (default: "Reintentar") */
  retryLabel?: string;
  /** Variante visual */
  variant?: 'card' | 'full' | 'inline';
  /** Clases adicionales */
  className?: string;
}

/**
 * Componente de estado de error con botón opcional de reintentar.
 *
 * Variantes:
 * - `card`: recuadro tipo card centrado (default)
 * - `full`: pantalla completa (ideal para páginas enteras)
 * - `inline`: texto sin padding extra
 */
export function ErrorView({
  title = 'Ocurrió un error',
  message,
  onRetry,
  retryLabel = 'Reintentar',
  variant = 'card',
  className = '',
}: ErrorViewProps): ReactNode {
  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-2 text-sm text-red-600 ${className}`}>
        <ErrorIcon className="h-4 w-4 shrink-0" />
        {title}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-1 underline hover:no-underline"
          >
            {retryLabel}
          </button>
        )}
      </span>
    );
  }

  const container = variant === 'full'
    ? 'flex min-h-[60vh] items-center justify-center px-4'
    : 'card p-8 text-center';

  return (
    <div className={`${container} ${className}`}>
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <ErrorIcon className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-red-700">{title}</p>
          {message && (
            <p className="mt-1 text-xs text-red-500">{message}</p>
          )}
        </div>
        {onRetry && (
          <button type="button" onClick={onRetry} className="btn-primary mt-1">
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function ErrorIcon({ className }: { className: string }): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
