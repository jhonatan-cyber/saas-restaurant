import { useState, useEffect, useRef } from 'react';
import { useRouter } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginSchema } from '@saas/shared';
import { authApi } from '~/lib';

type PageMode = 'loading' | 'login' | 'setup';

const adminLoginSchema = loginSchema.pick({ email: true, password: true });
const setupSchema = z.object({
  firstName: z.string().trim().min(1, 'El nombre es requerido'),
  lastName: z.string().trim().min(1, 'El apellido es requerido'),
  ci: z.string().trim().min(1, 'El CI es requerido'),
  phone: z.string().trim().min(1, 'El teléfono es requerido'),
  address: z.string().trim().min(1, 'La dirección es requerida'),
  email: z.string().trim().email('El correo es inválido'),
  password: z.string().optional(),
});

interface AdminLoginFields { email: string; password: string }
interface SetupFormFields {
  firstName: string; lastName: string; ci: string; phone: string;
  address: string; email: string; password?: string;
}

/* ── Iconitos inline (evitan dep extra) ─────────────────── */

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="5" />
      <path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2" />
    </svg>
  );
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IdIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <line x1="15" x2="15" y1="9" y2="15" />
      <line x1="9" x2="9" y1="9" y2="15" />
      <path d="M9 13h6" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function MenuGestLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none">
      <rect width="48" height="48" rx="12" className="fill-amber-500/20" />
      <path d="M14 16h8l6 16-6-4-4 4 2-8-6-8Z" className="fill-amber-400" />
      <circle cx="32" cy="18" r="6" className="fill-amber-400" stroke="white" strokeWidth="2" />
    </svg>
  );
}

/* ── Componentes compartidos ────────────────────────────── */

function FloatingOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-amber-500/5 blur-3xl" />
      <div className="absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-amber-600/5 blur-3xl" />
      <div className="absolute left-1/3 top-1/4 h-64 w-64 rounded-full bg-white/[0.02] blur-2xl" />
    </div>
  );
}

function GlassCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl ${className}`}
    >
      {/* Borde luminoso superior */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      {children}
    </div>
  );
}

function InputField({
  label, id, type = 'text', placeholder, error, registration, icon, autoFocus, readOnly, value,
}: {
  label: string; id: string; type?: string; placeholder?: string; error?: { message?: string };
  registration: UseFormRegisterReturn; icon?: ReactNode;
  autoFocus?: boolean; readOnly?: boolean; value?: string;
}) {
  return (
    <div className="group">
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-zinc-400 group-focus-within:text-amber-400 transition-colors duration-200">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-500 group-focus-within:text-amber-400 transition-colors duration-200">
            {icon}
          </div>
        )}
        <input
          id={id}
          type={type}
          value={value}
          readOnly={readOnly}
          autoFocus={autoFocus}
          {...registration}
          aria-invalid={!!error}
          placeholder={placeholder}
          className={`w-full rounded-xl border bg-white/[0.03] py-3 text-sm text-zinc-100 placeholder-zinc-600 transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0
            ${error
              ? 'border-red-500/50 focus:border-red-400 focus:ring-red-500/20'
              : 'border-white/[0.08] hover:border-white/[0.15] focus:border-amber-500/50 focus:ring-amber-500/20'
            }
            ${icon ? 'pl-10' : 'px-4'}
            ${readOnly ? 'cursor-not-allowed opacity-60' : ''}
          `}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error.message}</p>
      )}
    </div>
  );
}

function SubmitButton({
  loading, children, className = '',
}: {
  loading: boolean; children: ReactNode; className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={`group relative overflow-hidden rounded-xl bg-amber-500 px-6 py-3 text-sm font-semibold text-amber-950 transition-all duration-200
        hover:bg-amber-400 active:scale-[0.97]
        disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100
        ${className}`}
    >
      {/* Shimmer en hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
          </svg>
        ) : children}
      </span>
    </button>
  );
}

/* ── Login Page ─────────────────────────────────────────── */

export function LoginPage(): ReactNode {
  const [mode, setMode] = useState<PageMode>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const setupFormRef = useRef<HTMLFormElement>(null);

  const { register: rLogin, handleSubmit: hLogin, formState: { errors: eLogin } } = useForm<AdminLoginFields>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const {
    register: rSetup, handleSubmit: hSetup, formState: { errors: eSetup }, setValue, watch,
  } = useForm<SetupFormFields>({
    resolver: zodResolver(setupSchema),
    defaultValues: { firstName: '', lastName: '', ci: '', phone: '', address: '', email: '', password: '' },
  });

  const setupCi = watch('ci');
  const setupPw = watch('password') || setupCi || '';

  useEffect(() => { setValue('password', setupCi?.trim() ?? '', { shouldDirty: true, shouldValidate: true }); }, [setupCi, setValue]);

  useEffect(() => {
    const check = async () => {
      try {
        const meRes = await fetch('/api/admin/auth/me', { credentials: 'include' });
        if (meRes.ok) { router.navigate({ to: '/dashboard' }); return; }
        try {
          const setupRes = await fetch('/api/auth/setup-status');
          if (!setupRes.ok) { setMode('setup'); return; }
          const data = await setupRes.json().catch(() => ({ needsSetup: true }));
          setMode(data?.needsSetup ? 'setup' : 'login');
        } catch { setMode('setup'); }
      } catch { setMode('setup'); }
    };
    void check();
    setTimeout(() => setMounted(true), 50);
  }, [router]);

  const onLogin = async (data: AdminLoginFields) => {
    setError(null); setLoading(true);
    try {
      await authApi.doLogin(data.email, data.password);
      router.navigate({ to: '/dashboard' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally { setLoading(false); }
  };

  const onSetup = async (data: SetupFormFields) => {
    setError(null); setLoading(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email, password: data.password || data.ci,
          firstName: data.firstName, lastName: data.lastName,
          ci: data.ci, phone: data.phone, address: data.address,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.message || 'Error al crear el administrador'); }
      setMode('login'); setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el administrador');
    } finally { setLoading(false); }
  };

  /* ── Loading ── */
  if (mode === 'loading') {
    return (
      <div className="grain-overlay flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0c0a09] via-[#0e0c0b] to-[#1c1917]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <MenuGestLogo className="h-14 w-14" />
            <div className="absolute -inset-3 rounded-full bg-amber-500/10 blur-xl animate-pulse" />
          </div>
          <svg className="h-6 w-6 animate-spin text-amber-500/70" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-80" />
          </svg>
        </div>
      </div>
    );
  }

  /* ── Setup ── */
  if (mode === 'setup') {
    return (
      <div className="grain-overlay flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0c0a09] via-[#0e0c0b] to-[#1c1917] p-4">
        <FloatingOrbs />
        <div
          className="w-full max-w-lg"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(24px)',
            transition: 'opacity 700ms var(--ease-out-strong), transform 700ms var(--ease-out-strong)',
          }}
        >
          <div className="mb-8 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <MenuGestLogo className="h-10 w-10" />
              <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-100">
                MenuGest
              </h1>
            </div>
            <p className="text-sm text-zinc-500">
              Configurá el primer administrador del sistema
            </p>
          </div>

          <GlassCard>
            <form ref={setupFormRef} onSubmit={hSetup(onSetup)} className="space-y-5">
              {/* Fila: Nombre + Apellido */}
              <div className="grid grid-cols-2 gap-4">
                <div className="animate-fade-in-up" style={{ animationDelay: '100ms', animationDuration: '500ms' }}>
                  <InputField
                    label="Nombre" id="setup-firstName" placeholder="Carlos"
                    error={eSetup.firstName} registration={rSetup('firstName')}
                    icon={<UserIcon className="h-4 w-4" />} autoFocus
                  />
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '150ms', animationDuration: '500ms' }}>
                  <InputField
                    label="Apellido" id="setup-lastName" placeholder="Pérez"
                    error={eSetup.lastName} registration={rSetup('lastName')}
                    icon={<UserIcon className="h-4 w-4" />}
                  />
                </div>
              </div>

              {/* Fila: CI + Teléfono */}
              <div className="grid grid-cols-2 gap-4">
                <div className="animate-fade-in-up" style={{ animationDelay: '200ms', animationDuration: '500ms' }}>
                  <InputField
                    label="CI" id="setup-ci" placeholder="12345678"
                    error={eSetup.ci} registration={rSetup('ci')}
                    icon={<IdIcon className="h-4 w-4" />}
                  />
                </div>
                <div className="animate-fade-in-up" style={{ animationDelay: '250ms', animationDuration: '500ms' }}>
                  <InputField
                    label="Teléfono" id="setup-phone" type="tel" placeholder="099999999"
                    error={eSetup.phone} registration={rSetup('phone')}
                    icon={<PhoneIcon className="h-4 w-4" />}
                  />
                </div>
              </div>

              {/* Dirección */}
              <div className="animate-fade-in-up" style={{ animationDelay: '300ms', animationDuration: '500ms' }}>
                <InputField
                  label="Dirección" id="setup-address" placeholder="Calle 123, Ciudad"
                  error={eSetup.address} registration={rSetup('address')}
                  icon={<PinIcon className="h-4 w-4" />}
                />
              </div>

              {/* Email */}
              <div className="animate-fade-in-up" style={{ animationDelay: '350ms', animationDuration: '500ms' }}>
                <InputField
                  label="Correo electrónico" id="setup-email" type="email" placeholder="admin@ejemplo.com"
                  error={eSetup.email} registration={rSetup('email')}
                  icon={<MailIcon className="h-4 w-4" />}
                />
              </div>

              {/* Password (autogenerado) */}
              <div className="animate-fade-in-up" style={{ animationDelay: '400ms', animationDuration: '500ms' }}>
                <InputField
                  label="Contraseña" id="setup-password" type="password" placeholder="Se usará el CI"
                  error={eSetup.password} registration={rSetup('password')}
                  icon={<LockIcon className="h-4 w-4" />}
                  readOnly value={setupPw}
                />
                <input type="hidden" {...rSetup('password')} />
                <p className="mt-1.5 text-xs text-zinc-500">
                  La contraseña se genera automáticamente a partir del CI.
                </p>
              </div>

              {error && (
                <div className="animate-fade-in rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="animate-fade-in-up pt-2" style={{ animationDelay: '450ms', animationDuration: '500ms' }}>
                <SubmitButton loading={loading}>
                  Crear Super Administrador
                  <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </SubmitButton>
              </div>
            </form>
          </GlassCard>

          <p className="mt-6 text-center text-xs text-zinc-600">
            &copy; {new Date().getFullYear()} MenuGest — Panel de Administración
          </p>
        </div>
      </div>
    );
  }

  /* ── Login ── */
  return (
    <div className="grain-overlay flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0c0a09] via-[#0e0c0b] to-[#1c1917] p-4">
      <FloatingOrbs />
      <div
        className="w-full max-w-sm"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 700ms var(--ease-out-strong), transform 700ms var(--ease-out-strong)',
        }}
      >
        {/* Brand */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <MenuGestLogo className="h-10 w-10" />
            <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-100">
              MenuGest
            </h1>
          </div>
          <p className="text-sm text-zinc-500">
            Panel de Administración
          </p>
        </div>

        <GlassCard>
          <form onSubmit={hLogin(onLogin)} className="space-y-5">
            <div className="animate-fade-in-up" style={{ animationDelay: '100ms', animationDuration: '500ms' }}>
              <InputField
                label="Correo electrónico" id="email" type="email" placeholder="admin@ejemplo.com"
                error={eLogin.email} registration={rLogin('email')}
                icon={<MailIcon className="h-4 w-4" />} autoFocus
              />
            </div>

            <div className="animate-fade-in-up" style={{ animationDelay: '180ms', animationDuration: '500ms' }}>
              <InputField
                label="Contraseña" id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                error={eLogin.password} registration={rLogin('password')}
                icon={<LockIcon className="h-4 w-4" />}
              />
              <div className="mt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors duration-150"
                >
                  {showPassword ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            {error && (
              <div className="animate-fade-in rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="animate-fade-in-up pt-1" style={{ animationDelay: '260ms', animationDuration: '500ms' }}>
              <SubmitButton loading={loading}>
                Ingresar
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </SubmitButton>
            </div>
          </form>
        </GlassCard>

        <p className="mt-6 text-center text-xs text-zinc-600">
          &copy; {new Date().getFullYear()} MenuGest — Panel de Administración
        </p>
      </div>
    </div>
  );
}
