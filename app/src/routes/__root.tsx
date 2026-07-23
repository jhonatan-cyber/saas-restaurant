import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster } from 'sileo';
import { queryClient } from '../lib/query-client';
import { RouteErrorBoundary } from '../components/route-error-boundary';
import { NotFound } from '../components/not-found';
import '../styles/app.css';

/**
 * Root route de TanStack Start.
 * Renderiza el shell HTML y provee el QueryClient a toda la app.
 *
 * `errorComponent`: captura errores fatales que no fueron manejados
 * por boundaries más específicos (ej. error en QueryClientProvider).
 */
export const Route = createRootRoute({
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <NotFound />,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'MenuGest' },
    ],
    links: [
      {
        rel: 'preconnect',
        href: 'https://fonts.googleapis.com',
      },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent(): ReactNode {
  return (
    <html lang="es" className="h-full">
      <head>
        <HeadContent />
      </head>
      <body className="h-full">
        <QueryClientProvider client={queryClient}>
          <Toaster position="top-right" theme="dark" />
          <Outlet />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
