import { OrbSpinner } from '@saas/ui';
import type { ReactNode } from 'react';

/**
 * Componente pending reutilizable para rutas de TanStack Router.
 *
 * Se muestra mientras la ruta está cargando (lazy loading, SSR pending, etc.)
 * El layout padre (sidebar, topbar) permanece visible — solo el área de contenido
 * muestra el spinner.
 *
 * Uso:
 * ```ts
 * export const Route = createFileRoute('/_authed/dashboard')({
 *   component: DashboardPage,
 *   pendingComponent: RoutePending,
 *   pendingMs: 200,
 *   pendingMinMs: 300,
 * });
 * ```
 */
export function RoutePending(): ReactNode {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <OrbSpinner size={48} state="working" theme="auto" speed={1.25} />
    </div>
  );
}
