import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

interface NotFoundProps {
  /** Mensaje personalizado (default: "Página no encontrada") */
  title?: string;
  /** Mensaje secundario opcional */
  message?: string;
  /** Ruta a donde redirigir (default: /dashboard) */
  to?: string;
  /** Texto del botón (default: "Ir al dashboard") */
  buttonText?: string;
}

/**
 * Componente 404 reutilizable.
 *
 * Se usa como `notFoundComponent` en las rutas de TanStack Router.
 * - Root route: 404 standalone sin sidebar (la ruta `__root__` maneja URLs no coincidentes).
 * - `_authed` layout: 404 dentro del layout con sidebar visible (captura URLs no encontradas
 *   dentro de la zona autenticada, manteniendo sidebar y topbar).
 */
export function NotFound({
  title = 'Página no encontrada',
  message,
  to = '/dashboard',
  buttonText = 'Ir al dashboard',
}: NotFoundProps): ReactNode {
  const resolvedMessage =
    message ??
    'La página que buscas no existe o fue movida. Revisa la URL o vuelve al inicio.';

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 text-center">
        {/* Código 404 */}
        <span className="text-7xl font-bold tracking-tighter text-brand-200">404</span>

        {/* Icono */}
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <SearchIcon />
        </div>

        {/* Título */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{resolvedMessage}</p>
        </div>

        {/* Botones */}
        <div className="flex items-center gap-3">
          <Link to={to} className="btn-primary">
            {buttonText}
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            Volver atrás
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchIcon(): ReactNode {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 text-slate-400"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
