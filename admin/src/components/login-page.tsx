import { useState, useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@saas/shared';
import { authApi } from '~/lib';
import { OrbSpinner } from '@saas/ui';

type PageMode = 'loading' | 'login' | 'setup';

// Admin login: email + password (no businessSlug needed for SUPER_ADMIN platform)
const adminLoginSchema = loginSchema.pick({ email: true, password: true });

interface AdminLoginFields {
  email: string;
  password: string;
}

export function LoginPage(): ReactNode {
  const [mode, setMode] = useState<PageMode>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const router = useRouter();

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<AdminLoginFields>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const {
    register: registerSetup,
    handleSubmit: handleSetupSubmit,
    formState: { errors: setupErrors },
  } = useForm<AdminLoginFields>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    fetch('/api/admin/auth/me', { credentials: 'include' })
      .then((r) => {
        if (r.ok) {
          router.navigate({ to: '/dashboard' });
          return;
        }
        return fetch('/api/auth/setup-status')
          .then((r2) => r2.json())
          .then((data) => setMode(data.needsSetup ? 'setup' : 'login'))
          .catch(() => setMode('login'));
      })
      .catch(() => {
        setMode('login');
      });
  }, [router]);

  const onLogin = async (data: AdminLoginFields) => {
    setError(null);
    setLoading(true);

    try {
      await authApi.doLogin(data.email, data.password);
      router.navigate({ to: '/dashboard' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const onSetup = async (data: AdminLoginFields) => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Error al crear el administrador');
      }

      setMode('login');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el administrador');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-950 to-zinc-900">
        <OrbSpinner size={64} state="working" theme="dark" speed={3.0} />
      </div>
    );
  }

  if (mode === 'setup') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-950 to-zinc-900">
        <div className="w-full max-w-sm transform rounded-lg border border-zinc-800 bg-zinc-900 p-8 shadow-lg transition-all duration-200">
          <div className="mb-4 flex items-center justify-center">
            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
              MG
            </div>
            <h1 className="text-xl font-semibold text-white">Configuración Inicial</h1>
          </div>
          <p className="mb-6 text-center text-sm text-zinc-400">
            Creá el primer administrador del sistema
          </p>

          <form onSubmit={handleSetupSubmit(onSetup)} className="space-y-4">
            <div>
              <label htmlFor="setup-email" className="block text-sm font-medium text-zinc-300">
                Email
              </label>
              <input
                id="setup-email"
                type="email"
                {...registerSetup('email')}
                aria-invalid={!!setupErrors.email}
                aria-describedby={setupErrors.email ? 'setup-email-error' : undefined}
                className="mt-1 w-full rounded-full border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="admin@ejemplo.com"
                autoFocus
              />
              {setupErrors.email && (
                <p id="setup-email-error" className="mt-1 text-sm text-red-400">{setupErrors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="setup-password" className="block text-sm font-medium text-zinc-300">
                Contraseña
              </label>
              <input
                id="setup-password"
                type="password"
                {...registerSetup('password')}
                aria-invalid={!!setupErrors.password}
                aria-describedby={setupErrors.password ? 'setup-password-error' : undefined}
                className="mt-1 w-full rounded-full border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Mínimo 8 caracteres"
              />
              {setupErrors.password && (
                <p id="setup-password-error" className="mt-1 text-sm text-red-400">{setupErrors.password.message}</p>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <OrbSpinner size={18} state="working" theme="dark" /> : 'Crear Super Administrador'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-950 to-zinc-900 p-6">
        <div className="w-full max-w-sm transform rounded-lg border border-zinc-800 bg-zinc-900 p-8 shadow-lg transition-all duration-200">
          <div className="mb-4 flex items-center justify-center">
            <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
              MG
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">MenuGest Admin</h1>
              <p className="text-sm text-zinc-400">Panel de administración SUPER_ADMIN</p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                {...registerLogin('email')}
                aria-invalid={!!loginErrors.email}
                aria-describedby={loginErrors.email ? 'email-error' : undefined}
                className="mt-1 w-full rounded-full border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="admin@example.com"
                autoFocus
              />
              {loginErrors.email && (
                <p id="email-error" className="mt-1 text-sm text-red-400">{loginErrors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...registerLogin('password')}
                  aria-invalid={!!loginErrors.password}
                  aria-describedby={loginErrors.password ? 'password-error' : undefined}
                  className="mt-1 w-full rounded-full border border-zinc-700 bg-zinc-800 px-4 py-3 pr-12 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800/50"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="inline-flex items-center text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="mr-2 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500"
                />
                Recordarme
              </label>

              <a href="#" className="text-sm text-blue-400 hover:underline">Olvidé mi contraseña</a>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <OrbSpinner size={18} state="working" theme="dark" /> : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
  );
}
