import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthenticatedUserDTO } from '@saas/shared';
import { STORAGE_KEYS } from '@saas/shared';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthenticatedUserDTO | null;
  isHydrated: boolean;

  setAuth: (data: {
    accessToken: string;
    refreshToken: string;
    user: AuthenticatedUserDTO;
  }) => void;
  setUser: (user: AuthenticatedUserDTO) => void;
  clear: () => void;
  setHydrated: () => void;
}

/**
 * Store de autenticación con persistencia en localStorage.
 *
 * Por qué Zustand + persist (no cookies):
 *  - El backend emite tokens JWT que se envían vía header Authorization.
 *  - El frontend NO usa cookies HttpOnly en Phase 1 (se evalúa en Phase 5).
 *  - Persistir el user completo (sin el passwordHash) permite renderizar
 *    la UI inmediatamente en F5 sin esperar al /auth/me.
 *
 * `isHydrated` evita parpadeos: la UI puede mostrar "Cargando..." hasta
 * que Zustand haya rehidratado desde localStorage.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isHydrated: false,

      setAuth: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),

      setUser: (user) => set({ user }),

      clear: () =>
        set({ accessToken: null, refreshToken: null, user: null }),

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: STORAGE_KEYS.AUTH_TOKEN.replace('.token', ''), // 'saas.auth'
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

/** Helpers para acceder al store desde código no-React (api client, etc.) */
export const authStoreHelpers = {
  getToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  getUser: () => useAuthStore.getState().user,
  isAuthenticated: () => Boolean(useAuthStore.getState().accessToken),
  setAuth: useAuthStore.getState().setAuth,
  clear: useAuthStore.getState().clear,
};
