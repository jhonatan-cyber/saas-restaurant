import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthenticatedUserDTO } from '@saas/shared';
import { STORAGE_KEYS } from '@saas/shared';

interface AuthState {
  user: AuthenticatedUserDTO | null;
  isHydrated: boolean;

  setAuth: (user: AuthenticatedUserDTO) => void;
  setUser: (user: AuthenticatedUserDTO) => void;
  clear: () => void;
  setHydrated: () => void;
}

/**
 * Store de autenticación para el admin web.
 *
 * MEJORA DE SEGURIDAD (Phase 5):
 *  - Los tokens JWT YA NO se almacenan en localStorage.
 *  - Ahora se manejan como cookies HttpOnly (inaccesibles desde JS).
 *  - El user se persiste solo para hidratación rápida de la UI,
 *    pero la validez real se verifica contra GET /auth/me.
 *
 * Por qué persist:
 *  - Guardar el user permite mostrar la UI inmediatamente en F5,
 *    sin esperar la respuesta de /auth/me (que verifica las cookies).
 *  - Si /auth/me falla (cookies expiradas), se redirige a /login.
 *
 * `isHydrated` evita parpadeos: la UI puede mostrar "Cargando..."
 * hasta que Zustand haya rehidratado desde localStorage.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isHydrated: false,

      setAuth: (user) => set({ user }),

      setUser: (user) => set({ user }),

      clear: () => set({ user: null }),

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: STORAGE_KEYS.AUTH_TOKEN.replace('.token', ''), // 'saas.auth'
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
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
  getUser: () => useAuthStore.getState().user,
  isAuthenticated: () => Boolean(useAuthStore.getState().user),
  setAuth: useAuthStore.getState().setAuth,
  clear: useAuthStore.getState().clear,
};
