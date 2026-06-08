import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  setTheme: (theme: Theme) => void;
}

const THEME_KEY = 'saas.admin.theme';

/**
 * Aplica la clase `light` al <html> según el tema actual.
 * Se llama en cada cambio y al rehidratar.
 */
function applyThemeClass(theme: Theme): void {
  if (typeof document === 'undefined') return;
  if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
}

/**
 * Store de tema oscuro/claro con persistencia en localStorage.
 * El tema oscuro es el default. Al hacer toggle se agrega/remueve
 * la clase `light` en <html> para que las variantes `light:` de
 * Tailwind se activen.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',

      toggle: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        applyThemeClass(next);
        set({ theme: next });
      },

      setTheme: (theme: Theme) => {
        applyThemeClass(theme);
        set({ theme });
      },
    }),
    {
      name: THEME_KEY,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeClass(state.theme);
        }
      },
    },
  ),
);
