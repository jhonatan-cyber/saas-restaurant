export const uiThemeTokens = {
  colors: {
    brand: {
      50: '#ffffff',
      100: '#f7f7f7',
      200: '#e6e6e6',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    slate: {
      50: '#ffffff',
      100: '#f7f7f7',
      200: '#e6e6e6',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
  },
  typography: {
    sans: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    mono: '"SFMono-Regular", ui-monospace, "Cascadia Mono", monospace',
  },
  radius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
  shadow: {
    soft: '0 18px 40px -24px rgba(0, 0, 0, 0.35)',
  },
} as const;

export type UiThemeTokens = typeof uiThemeTokens;
