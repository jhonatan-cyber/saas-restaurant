import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, createFileRoute, redirect, Link } from '@tanstack/react-router';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { authApi, ApiClientError } from '../lib/api';
import { useAuthStore, authStoreHelpers } from '../lib/auth-store';
import { loginFormSchema, loginFormDefaults, type LoginFormValues } from '../lib/schemas';

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (authStoreHelpers.isAuthenticated()) {
      throw redirect({ to: '/dashboard' });
    }
  },
  component: LoginPage,
});

function LoginPage(): ReactNode {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      if (err instanceof ApiClientError) {
        setServerError(err.message);
      } else if (err instanceof Error) {
        setServerError(err.message);
      } else {
        setServerError('Error desconocido al iniciar sesión');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">SaaS Restaurant</h1>
          <p className="mt-2 text-sm text-slate-600">Ingresa a tu restaurante</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label htmlFor="businessSlug" className="label">
                Negocio (slug)
              </label>
              <input
                id="businessSlug"
                type="text"
                autoComplete="organization"
                className="input"
                placeholder="demo"
                {...register('businessSlug')}
              />
              {errors.businessSlug && (
                <p className="mt-1 text-xs text-red-600">{errors.businessSlug.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="[email protected]"
                {...register('email')}
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            <p>
              ¿No tienes cuenta?{' '}
              <Link to="/" className="text-brand-600 hover:underline">
                Volver al inicio
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Demo: businessSlug <code className="font-mono">demo</code> ·{' '}
          <code className="font-mono">[email protected]</code> ·{' '}
          <code className="font-mono">Owner123!</code>
        </p>
      </div>
    </div>
  );
}
