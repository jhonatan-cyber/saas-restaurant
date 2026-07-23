import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';
import { OrbSpinner } from '@saas/ui';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 5,
      staleTime: 1000 * 60 * 1,
      retry: 1,
    },
  },
});

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    basepath: '/admin',
    context: {
      queryClient,
    },
    // Evita hydration mismatch: durante SSR la ruta ya se resolvió y muestra el
    // loading spinner de LoginPage, pero en el cliente el router aún no ha
    // terminado de matchear y mostraría <Suspense fallback={null}>.
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
    defaultPendingComponent: () => (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <OrbSpinner size={64} state="working" theme="dark" speed={1.25} />
      </div>
    ),
  });
}

export const getRouter = createRouter;

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
