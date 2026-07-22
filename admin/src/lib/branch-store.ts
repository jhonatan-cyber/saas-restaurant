import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AuthenticatedUserDTO } from '@saas/shared';
import { STORAGE_KEYS } from '@saas/shared';

interface BranchState {
  activeBranchId: string | null;
  setActiveBranchId: (id: string | null) => void;
  /** Alinea la sucursal activa con el usuario (login / refresh /me). */
  syncFromUser: (user: AuthenticatedUserDTO) => void;
  clear: () => void;
}

function resolveDefaultBranchId(user: AuthenticatedUserDTO): string | null {
  return user.defaultBranchId ?? user.branches[0]?.id ?? null;
}

/**
 * Sucursal activa del admin. Se persiste por usuario/browser.
 * El cliente HTTP envía `x-branch-id` desde este store cuando no se pasa explícito.
 */
export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      activeBranchId: null,

      setActiveBranchId: (id) => set({ activeBranchId: id }),

      syncFromUser: (user) => {
        const allowed = new Set(user.branches.map((b) => b.id));
        const current = get().activeBranchId;
        if (current && allowed.has(current)) return;
        set({ activeBranchId: resolveDefaultBranchId(user) });
      },

      clear: () => set({ activeBranchId: null }),
    }),
    {
      name: STORAGE_KEYS.ACTIVE_BRANCH,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ activeBranchId: state.activeBranchId }),
    },
  ),
);

export const branchStoreHelpers = {
  getActiveBranchId: () => useBranchStore.getState().activeBranchId,
  setActiveBranchId: (id: string | null) => useBranchStore.getState().setActiveBranchId(id),
  syncFromUser: (user: AuthenticatedUserDTO) => useBranchStore.getState().syncFromUser(user),
  clear: () => useBranchStore.getState().clear(),
};
