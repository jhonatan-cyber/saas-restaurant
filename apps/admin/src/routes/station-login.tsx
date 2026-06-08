import { useEffect, useState, type ReactNode } from 'react';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { authApi, ApiClientError } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';

/**
 * Ruta pública para auto-login desde una estación POS desktop.
 *
 * La app desktop (Tauri) abre esta URL con los query params:
 *   /station-login?sig=<businessSig>&station=<stationId>&branch=<branchId>
 *
 * El frontend intercambia el `sig` (JWT firmado de estación) por una
 * sesión de usuario completa (accessToken + refreshToken + user DTO)
 * y redirige al POS.
 */
export const Route = createFileRoute('/station-login')({
  component: StationLoginPage,
  validateSearch: (search: Record<string, string | undefined>) => ({
    sig: search.sig ?? '',
    station: search.station ?? '',
    branch: search.branch ?? '',
  }),
});

function StationLoginPage(): ReactNode {
  const navigate = useNavigate();
  const { sig } = useSearch({ from: Route.id });
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sig) {
      setError('No se recibió el token de estación');
      return;
    }

    let cancelled = false;

    async function doLogin(): Promise<void> {
      try {
        const response = await authApi.stationLogin(sig);
        if (cancelled) return;

        setAuth({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          user: response.user,
        });

        await navigate({ to: '/pos' });
      } catch (err: unknown) {
        if (cancelled) return;
        const msg =
          err instanceof ApiClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Error al iniciar sesión automática';
        setError(msg);
      }
    }

    void doLogin();

    return () => {
      cancelled = true;
    };
  }, [sig, navigate, setAuth]);

  // Estado de carga mientras se procesa
  if (!error) {
    return <LoadingView message="Iniciando sesión de estación POS…" variant="full" />;
  }

  // Error: mostrar mensaje y link para login manual
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md text-center">
        <div className="card p-8">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-6 w-6 text-red-600"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-slate-900">
            Error de activación
          </h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            type="button"
            className="btn-primary mt-6 w-full"
            onClick={() => void navigate({ to: '/login' })}
          >
            Ir al login manual
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componentes livianos inline ──────────────────────────────────────

function LoadingView({ message, variant }: {
  message: string;
  variant: 'full' | 'card';
}): ReactNode {
  const container = variant === 'full'
    ? 'flex min-h-screen items-center justify-center'
    : 'card p-8 text-center';

  return (
    <div className={container}>
      <div className="flex flex-col items-center gap-3">
        <svg
          className="h-6 w-6 animate-spin text-brand-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}
