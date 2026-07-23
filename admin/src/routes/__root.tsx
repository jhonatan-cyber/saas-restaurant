import { Outlet, createRootRoute, HeadContent, Scripts } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster } from 'sileo';
import 'sileo/styles.css';
import { queryClient } from '../router';
import '../styles/app.css';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'MenuGest — Admin' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
    ],
  }),
  component: RootLayout,
});

function RootLayout(): ReactNode {
  return (
    <QueryClientProvider client={queryClient}>
      <HeadContent />
      <Toaster />
      <Outlet />
      <Scripts />
    </QueryClientProvider>
  );
}
