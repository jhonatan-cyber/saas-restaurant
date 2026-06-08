import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { sileo } from 'sileo';
import { authApi, ApiClientError } from '../lib/api';
import { useAuthStore, authStoreHelpers } from '../lib/auth-store';
import { loginFormSchema, loginFormDefaults, type LoginFormValues } from '../lib/schemas';
import logoUrl from '../../../../packages/ui/src/assets/logo.webp';

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (authStoreHelpers.isAuthenticated()) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: LoginPage,
});

// ── SVG Icons inline (sin dependencias) ──────────────────────────────────────

function MailIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
      <path d="M19 8.839l-7.77 3.885a2.75 2.75 0 01-2.46 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 00-2 2v1a2 2 0 002 2h1v5a1 1 0 001 1h8a1 1 0 001-1V9h1a2 2 0 002-2V6a2 2 0 00-2-2H4zm3 7h2v4H7v-4zm6 0h-2v4h2v-4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 1.5 4.5 3.5v4.7c0 3.5 2.2 6.9 5.5 8.3 3.3-1.4 5.5-4.8 5.5-8.3V3.5L10 1.5zm0 3a.75.75 0 01.75.75v4.17l1.28 1.28a.75.75 0 11-1.06 1.06L9.5 11.17V5.25A.75.75 0 0110 4.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2 3 5.5v9L10 18l7-3.5v-9L10 2zm0 2.1 4.8 2.4L10 9 5.2 6.5 10 4.1zM5 8.2l4.25 2.13v4.55L5 12.75V8.2zm10 0v4.55l-4.25 2.13V10.3L15 8.2z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 10a3 3 0 100-6 3 3 0 000 6zm-5.5 7a5.5 5.5 0 1111 0h-2a3.5 3.5 0 10-7 0h-2zM15.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm.5 8h2a4.5 4.5 0 00-4.5-4.5h-.5a6 6 0 013 4.5z" />
    </svg>
  );
}

// ── Componente de campo con icono ────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  id: string;
  type: string;
  placeholder: string;
  autoComplete: string;
  icon: ReactNode;
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
}

function FormField({ label, id, type, placeholder, autoComplete, icon, error, registration }: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-slate-300">
        {label}
      </label>
      <div
        className={`relative flex items-center overflow-hidden rounded-full border transition-all duration-200 ${
          focused
            ? 'border-brand-400 ring-2 ring-brand-500/15'
            : error
              ? 'border-red-300 ring-1 ring-red-500/10'
              : 'border-slate-700 hover:border-slate-600'
        }`}
      >
        <span
          className={`flex items-center justify-center pl-3 transition-colors duration-200 ${
            focused ? 'text-brand-400' : error ? 'text-red-400' : 'text-slate-500'
          }`}
        >
          {icon}
        </span>
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="block w-full border-none bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-0"
          {...registration}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            registration.onBlur?.(e);
          }}
        />
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-red-500 animate-fadeIn">
          <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8 1a7 7 0 100 14A7 7 0 008 1zM7.25 5a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0V5zm.75 6a.75.75 0 100-1.5.75.75 0 000 1.5z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

function getLoginErrorMessage(err: unknown): { title: string; description: string } {
  if (err instanceof ApiClientError) {
    if (err.statusCode === 401) {
      return {
        title: 'Credenciales incorrectas',
        description: 'Revisá el negocio, el email y la contraseña.',
      };
    }

    if (err.statusCode >= 500) {
      return {
        title: 'Error del servidor',
        description: 'No pudimos iniciar sesión. Probá nuevamente en unos segundos.',
      };
    }

    return {
      title: 'No se pudo iniciar sesión',
      description: err.message,
    };
  }

  if (err instanceof Error) {
    if (err.message === 'HTTPError') {
      return {
        title: 'Error del servidor',
        description: 'No pudimos iniciar sesión. Probá nuevamente en unos segundos.',
      };
    }

    return {
      title: 'No se pudo iniciar sesión',
      description: err.message,
    };
  }

  return {
    title: 'No se pudo iniciar sesión',
    description: 'Ocurrió un error inesperado.',
  };
}

// ── Página de Login ──────────────────────────────────────────────────────────

function LoginPage(): ReactNode {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mounted = true;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: loginFormDefaults,
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await authApi.login(values);
      setAuth({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
      });
      await navigate({ to: '/dashboard' });
    } catch (err) {
      const { title, description } = getLoginErrorMessage(err);
      setServerError(description);
      sileo.error({
        title,
        description,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* ── Background animado ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900" />

        {/* Círculos decorativos animados */}
        <div
          className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full opacity-20 blur-[120px] transition-all duration-1000"
          style={{
            background:
              'radial-gradient(circle, rgba(249,115,22,0.3) 0%, rgba(234,88,12,0.1) 50%, transparent 70%)',
            transform: mounted ? 'translate(0, 0) scale(1)' : 'translate(-50px, -50px) scale(0.8)',
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-150 w-150 rounded-full opacity-10 blur-[150px] transition-all duration-1000 delay-200"
          style={{
            background:
              'radial-gradient(circle, rgba(251,146,60,0.2) 0%, rgba(249,115,22,0.05) 50%, transparent 70%)',
            transform: mounted ? 'translate(0, 0) scale(1)' : 'translate(50px, 50px) scale(0.8)',
          }}
        />

        {/* Grid sutil */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Contenido ────────────────────────────────────────────────────────── */}
      <div
        className="relative w-full transition-all duration-700 ease-out"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
        }}
      >
        <div className="relative grid min-h-screen w-full lg:grid-cols-[1.12fr_0.88fr]">
          <aside className="relative overflow-hidden px-8 py-10 sm:px-12 lg:px-16 lg:py-12">
            <div className="pointer-events-none absolute -left-30 -top-20 h-85 w-85 rounded-full bg-brand-500/10 blur-[100px]" />
            <div className="pointer-events-none absolute -bottom-35 -right-20 h-90 w-90 rounded-full bg-cyan-400/10 blur-[120px]" />

            <div className="relative flex h-full flex-col justify-start gap-4 pt-6 xl:gap-6">
              <div className="relative max-w-2xl">
                <img
                  src={logoUrl}
                  alt="MenuGest"
                  className="pointer-events-none block h-[800px] w-[800px] max-w-none object-contain drop-shadow-[0_18px_34px_rgba(0,0,0,0.4)] sm:h-[800px] sm:w-[800px]"
                  style={{
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'scale(1)' : 'scale(0.85)',
                    transition: 'opacity 700ms ease-out, transform 700ms ease-out',
                  }}
                />

                <div className="-mt-[220px] space-y-3 sm:-mt-[240px] lg:-mt-[260px]">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-medium tracking-[0.22em] text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Multi-Sucursales
                  </div>

                  <p className="max-w-2xl text-balance text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-[2.75rem]">
                    Todo el control de tus restaurantes en un solo lugar.
                  </p>

                  <p className="max-w-xl text-sm leading-6 text-slate-300 lg:text-base">
                    Centralizá múltiples locales, pedidos, caja y stock sin perder visibilidad por
                    sucursal.
                  </p>
                </div>
              </div>

              <div className="grid max-w-2xl gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3 rounded-3xl border border-white/8 bg-white/5 px-4 py-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.14)]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
                    <ShieldIcon />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">Seguridad por negocio</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Cada restaurante entra a su propio espacio, con datos separados y protegidos.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-3xl border border-white/8 bg-white/5 px-4 py-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.14)]">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                    <BoxIcon />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">Vista central</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Veés ventas, stock y caja de todos los locales sin saltar entre pantallas.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-3xl border border-white/8 bg-white/5 px-4 py-3.5 shadow-[0_12px_28px_rgba(0,0,0,0.14)] md:col-span-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
                    <UsersIcon />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white">Equipos y sucursales</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Cada local mantiene su flujo, pero la coordinación general sigue unificada.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex items-center justify-center px-8 py-10 sm:px-12 lg:px-16 lg:py-16">
            <div className="w-full max-w-lg rounded-4xl bg-[#11182d] px-7 py-8 shadow-[0_18px_60px_rgba(0,0,0,0.18)] ring-1 ring-white/5 lg:px-8 lg:py-10">
              <div className="mb-10 text-center">
                <h2 className="font-serif text-4xl font-semibold text-white">Bienvenido</h2>
                <p className="mt-3 text-sm text-slate-400">Inicia sesión para continuar</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <FormField
                  label="Negocio (slug)"
                  id="businessSlug"
                  type="text"
                  placeholder="demo"
                  autoComplete="organization"
                  icon={<StoreIcon />}
                  error={errors.businessSlug?.message}
                  registration={register('businessSlug')}
                />

                <FormField
                  label="Correo electrónico"
                  id="email"
                  type="email"
                  placeholder="usuario@correo.com"
                  autoComplete="email"
                  icon={<MailIcon />}
                  error={errors.email?.message}
                  registration={register('email')}
                />

                <FormField
                  label="Contraseña"
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  icon={<LockIcon />}
                  error={errors.password?.message}
                  registration={register('password')}
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative mt-2 w-full overflow-hidden rounded-full bg-white px-4 py-3 text-sm font-medium text-slate-900 shadow-lg shadow-white/10 transition-all duration-200 hover:bg-slate-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                >
                  <span
                    className={`flex items-center justify-center gap-2 transition-all duration-200 ${
                      isSubmitting ? 'opacity-0' : 'opacity-100'
                    }`}
                  >
                    Iniciar Sesión
                    <ArrowRightIcon />
                  </span>
                  {isSubmitting && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <SpinnerIcon />
                    </span>
                  )}
                </button>

                {serverError && (
                  <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 animate-fadeIn">
                    <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{serverError}</span>
                  </div>
                )}
              </form>

              <div className="mt-8 text-center text-sm text-slate-300">¿Olvidaste tu contraseña?</div>
            </div>
          </div>
        </div>

        <div
          className="mt-8 text-center transition-all duration-700 delay-500"
          style={{ opacity: mounted ? 1 : 0 }}
        >
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} <a href="https://www.nuwesoft.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
              Nuwesoft.com
            </a> - MenuGest. Todos los derechos reservados.
          </p>
        </div>
      </div>
      {/* ── Animaciones keyframes ─────────────────────────────────────────────── */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
