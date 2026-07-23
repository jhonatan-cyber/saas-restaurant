import { useEffect, type ReactNode } from 'react';
import { useRouter } from '@tanstack/react-router';
import { ErrorView } from './error-view';

interface RouteErrorBoundaryProps {
  error: unknown;
  reset: () => void;
}

/**
 * Error boundary component for TanStack Router routes.
 *
 * Se usa como `errorComponent` en las rutas para capturar errores
 * de renderizado y mostrar una UI amigable con opción de reintentar.
 *
 * - Root (`__root.tsx`): errores fatales (sin sidebar).
 * - Authed (`_authed.tsx`): errores dentro del layout autenticado
 *   (sidebar visible, solo el contenido falla).
 *
 * Para errores 404 usar `notFoundComponent` de TanStack Router en cada ruta.
 *
 * Loggea el error en consola para debugging.
 */
export function RouteErrorBoundary({ error, reset }: RouteErrorBoundaryProps): ReactNode {
  const router = useRouter();

  // Normalizar el error a string para mostrar
  const errorMessage = error instanceof Error
    ? error.message
    : error != null
      ? String(error)
      : undefined;

  // Loggear el error para debugging
  useEffect(() => {
    console.error('[RouteErrorBoundary] Error capturado:', error);
    if (error instanceof Error) {
      console.error('[RouteErrorBoundary] Stack:', error.stack);
    }
  }, [error]);

  return (
    <ErrorView
      title="Error inesperado"
      message={errorMessage ?? 'Ocurrió un error al renderizar esta sección.'}
      variant="full"
      retryLabel="Reintentar"
      onRetry={reset}
    />
  );
}
