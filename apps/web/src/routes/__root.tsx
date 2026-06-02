import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryClient } from '../lib/query-client';
import '../styles/app.css';

/**
 * Root route de TanStack Start.
 * Renderiza el shell HTML y provee el QueryClient a toda la app.
 */
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'SaaS Restaurant' },
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
          <Outlet />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
