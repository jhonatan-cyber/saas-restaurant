import { OrbSpinner } from '@saas/ui';
import type { ReactNode } from 'react';

/**
 * Componente pending reutilizable para rutas de TanStack Router.
 *
 * Se muestra mientras la ruta está cargando (lazy loading, SSR pending, etc.)
 * Es un spinner centrado en el área de contenido, NO de pantalla completa
 * (el layout padre permanece visible).
 *
 * Uso:
 * ```ts
 * export const Route = createFileRoute('/_authed/dashboard')({
 *   component: DashboardPage,
 *   pendingComponent: RoutePending,
 * });
 * ```
 */
export function RoutePending(): ReactNode {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <OrbSpinner size={48} state="working" theme="dark" speed={1.25} />
    </div>
  );
}
