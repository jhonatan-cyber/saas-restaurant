import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { sileo } from 'sileo';
import { authApi, ApiClientError } from '../lib/api';
import { useAuthStore, authStoreHelpers } from '../lib/auth-store';
import { useThemeStore } from '../lib/theme-store';
import { loginFormSchema, loginFormDefaults, type LoginFormValues } from '../lib/schemas';
import { BorderBeam } from 'border-beam';

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

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <circle cx="12" cy="12" r="5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="1" x2="12" y2="3" strokeLinecap="round" />
      <line x1="12" y1="21" x2="12" y2="23" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeLinecap="round" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeLinecap="round" />
      <line x1="1" y1="12" x2="3" y2="12" strokeLinecap="round" />
      <line x1="21" y1="12" x2="23" y2="12" strokeLinecap="round" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeLinecap="round" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeLinecap="round" strokeLinejoin="round" />
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
  beam?: boolean;
  registration: ReturnType<ReturnType<typeof useForm>['register']>;
}

function FormField({ label, id, type, placeholder, autoComplete, icon, error, registration, beam }: FormFieldProps) {
  const [focused, setFocused] = useState(false);

  const inputContent = (
    <div
        className={`relative flex w-full items-center overflow-hidden rounded-full border bg-white/5 backdrop-blur-sm transition-all duration-200 light:bg-white light:shadow-sm ${
        focused
          ? 'border-white/70 ring-2 ring-white/20 light:border-black/40 light:ring-2 light:ring-black/10'
          : error
            ? 'border-red-400 ring-1 ring-red-500/10'
            : 'border-white/10 hover:border-white/30 light:border-black/10 light:hover:border-black/30'
      }`}
    >
      <span
        className={`flex items-center justify-center pl-3 transition-colors duration-200 ${
          focused ? 'text-white/80 light:text-black/60' : error ? 'text-red-400' : 'text-white/50 light:text-black/40'
        }`}
      >
        {icon}
      </span>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="block min-w-0 flex-1 border-none bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-0 light:text-black light:placeholder:text-black/30"
        {...registration}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          registration.onBlur?.(e);
        }}
      />
    </div>
  );

  return (
    <div className="w-full space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-white/60 light:text-black/60">
        {label}
      </label>
      {beam ? <BorderBeam size="md" colorVariant="ocean" duration={6} strength={0.8} borderRadius={9999}>{inputContent}</BorderBeam> : inputContent}
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
  const { theme, toggle: toggleTheme } = useThemeStore();
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
      // El API setea cookies HttpOnly + devuelve user + tokens en body.
      // El frontend usa cookies (se envían automáticamente).
      const response = await authApi.login(values);

      // Guardar solo el user (los tokens van en cookies HttpOnly)
      setAuth(response.user);

      // Inicializar CSRF token
      await authApi.getCsrfToken().catch(() => {
        // Non-critical: si falla, el CSRF se refrescará en el primer 403
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
    <div className="relative min-h-screen overflow-hidden bg-black light:bg-white">
        <button
          onClick={toggleTheme}
          className="absolute right-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/60 transition-all duration-200 hover:border-white/30 hover:text-white light:border-black/10 light:bg-white light:text-black/60 light:shadow-sm light:hover:border-black/30 light:hover:text-black"
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      {/* ── Background animado ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Gradient base */}
        <div className="absolute inset-0 bg-black light:bg-white" />

        {/* Círculos decorativos animados */}
        <div
          className={`absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full blur-[120px] transition-all duration-1000 ${
            theme === 'light' ? 'opacity-5' : 'opacity-20'
          }`}
          style={{
            background:
              theme === 'light'
                ? 'radial-gradient(circle, rgba(0,0,0,0.06) 0%, transparent 60%)'
                : 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 60%)',
            transform: mounted ? 'translate(0, 0) scale(1)' : 'translate(-50px, -50px) scale(0.8)',
          }}
        />
        <div
          className={`absolute -bottom-40 -right-40 h-150 w-150 rounded-full blur-[150px] transition-all duration-1000 delay-200 ${
            theme === 'light' ? 'opacity-3' : 'opacity-8'
          }`}
          style={{
            background:
              theme === 'light'
                ? 'radial-gradient(circle, rgba(0,0,0,0.04) 0%, transparent 60%)'
                : 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)',
            transform: mounted ? 'translate(0, 0) scale(1)' : 'translate(50px, 50px) scale(0.8)',
          }}
        />

        {/* Grid sutil */}
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.03,
            backgroundImage:
              theme === 'light'
                ? 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)'
                : 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
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
        <div className="flex min-h-dvh w-full flex-col">
          <div className="flex flex-1 items-center justify-center px-4">
            <div className="w-full max-w-xl light:[&_form]:drop-shadow-sm">
              <div className="mb-8 text-center">
                <h2 className="font-serif text-3xl font-semibold text-white light:text-black">Bienvenido</h2>
                <p className="mt-2 text-sm text-white/50 light:text-black/50">Inicia sesión para continuar</p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-sm space-y-5" noValidate>
                <FormField
                  label="Negocio (slug)"
                  id="businessSlug"
                  type="text"
                  placeholder="demo"
                  autoComplete="organization"
                  icon={<StoreIcon />}
                  error={errors.businessSlug?.message}
                  registration={register('businessSlug')}
                  beam
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
                  beam
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
                  beam
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group mt-4 w-full overflow-hidden rounded-full bg-white px-4 py-3 text-sm font-medium text-black shadow-lg shadow-white/10 transition-all duration-200 hover:bg-white/90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:active:scale-100 light:bg-black light:text-white light:shadow-lg light:shadow-black/10 light:hover:bg-black/90"
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

              <div className="mt-6 text-center text-sm text-white/50 light:text-black/50">¿Olvidaste tu contraseña?</div>
            </div>
        </div>
        <div
            className="pb-6 pt-4 text-center transition-all duration-700 delay-500"
            style={{ opacity: mounted ? 1 : 0 }}
          >
            <p className="text-xs text-white/30 light:text-black/30">
              &copy; {new Date().getFullYear()} <a href="https://www.nuwesoft.com" target="_blank" rel="noopener noreferrer" className="hover:underline">
                Nuwesoft.com
              </a> - MenuGest. Todos los derechos reservados.
            </p>
          </div>
        </div>
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
    </div>
  );
}
