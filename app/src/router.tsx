import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { QueryClient } from '@tanstack/react-query';
import { routeTree } from './routeTree.gen';

// Create a new query client for the router
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 5, // 5 minutes
      staleTime: 1000 * 60 * 1, // 1 minute
      retry: 1,
    },
  },
});

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    basepath: '/',
    defaultPendingMs: 200,
    defaultPendingMinMs: 300,
    context: {
      queryClient,
    },
  });
}

export const getRouter = createRouter;

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
