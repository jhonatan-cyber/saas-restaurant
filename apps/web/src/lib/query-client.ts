import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient del frontend.
 * Centraliza defaults de React Query (staleTime, retry, refetchOnWindowFocus).
 * Phase 1: configuración conservadora; se ajustará en cada módulo.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
