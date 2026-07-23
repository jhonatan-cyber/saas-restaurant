import { createFileRoute, redirect } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { businessApi } from '../lib/api';
import { authStoreHelpers } from '../lib/auth-store';
import { OrbSpinner } from '@saas/ui';

/**
 * Ruta dinámica /{businessSlug}
 *
 * Verifica si el slug del negocio existe:
 *  - Si existe → redirige al login con el slug pre-cargado
 *  - Si no existe → muestra pantalla de "negocio no encontrado"
 *    con botón para ir a la landing page
 */
export const Route = createFileRoute('/$slug')({
  beforeLoad: () => {
    // Si ya tiene sesión, no tiene sentido pasar por esta pantalla
    if (authStoreHelpers.isAuthenticated()) {
      throw redirect({ to: '/dashboard' });
    }
  },
  loader: async ({ params }) => {
    const { slug } = params;
    const { exists } = await businessApi.checkSlug(slug).catch(() => ({ exists: false }));
    if (exists) {
      throw redirect({ to: '/login', search: { slug } as Record<string, string> });
    }
    return { slug };
  },
  component: BusinessNotFound,
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-black light:bg-white">
      <OrbSpinner size={64} state="working" theme="auto" speed={1.25} />
    </div>
  ),
});

export function BusinessNotFound({ slug: testSlug }: { slug?: string }): ReactNode {
  const { slug } = testSlug ? { slug: testSlug } : Route.useLoaderData();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-black px-4 light:bg-white">
      {/* Background decorativo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-black light:bg-white" />
        <div
          className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full opacity-10 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-150 w-150 rounded-full opacity-5 blur-[150px]"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Contenido */}
      <div className="relative z-10 mx-auto max-w-md text-center">
        {/* Icono */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-10 w-10 text-white/60 light:text-black/60"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        {/* Título */}
        <h1 className="font-serif text-3xl font-semibold text-white light:text-black">
          Negocio no encontrado
        </h1>

        {/* Slug */}
        <p className="mt-2 text-sm text-white/40 light:text-black/40">
          <code className="rounded bg-white/5 px-2 py-0.5 font-mono text-white/60 light:bg-black/5 light:text-black/60">
            {slug}
          </code>
        </p>

        {/* Mensaje */}
        <p className="mx-auto mt-4 max-w-sm text-base text-white/60 light:text-black/60">
          El negocio que buscas no existe o no está registrado en nuestra plataforma.
          Comunícate con administración para realizar tu registro.
        </p>

        {/* Botón a landing */}
        <div className="mt-8">
          <a
            href="http://localhost:4321"
            className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black shadow-lg shadow-white/10 transition-all duration-200 hover:bg-white/90 active:scale-[0.97] light:bg-black light:text-white light:shadow-lg light:shadow-black/10 light:hover:bg-black/90"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4 transition-transform group-hover:-translate-x-0.5"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
            Ir a la página principal
          </a>
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-white/30 light:text-black/30">
          &copy; {new Date().getFullYear()} MenuGest. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
