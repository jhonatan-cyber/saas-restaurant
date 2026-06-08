import { useState, type ReactNode } from 'react';
import { open } from '@tauri-apps/plugin-shell';

interface PosViewProps {
  activation: {
    businessSig: string;
    branchId: string;
    stationId: string;
  };
  onDeactivate: () => void;
}

/**
 * URLs permitidas para el iframe del POS.
 * En desarrollo: localhost.
 * En producción: el dominio de la web app.
 * Cualquier URL fuera de esta lista será rechazada.
 */
const ALLOWED_ORIGINS_PATTERNS: readonly RegExp[] = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.saasrestaurant\.app$/,
  /^https:\/\/[a-z0-9-]+\.saasrestaurant\.com$/,
];

function isOriginAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    const origin = parsed.origin;
    return ALLOWED_ORIGINS_PATTERNS.some((pattern) => pattern.test(origin));
  } catch {
    return false;
  }
}

function buildPosUrl(
  webAppUrl: string,
  businessSig: string,
  stationId: string,
  branchId: string,
): string | null {
  // Normalizar: remover trailing slash
  const base = webAppUrl.replace(/\/+$/, '');
  if (!isOriginAllowed(base)) {
    console.error(
      `[PosView] URL bloqueada por seguridad: "${base}". ` +
      'Usá VITE_WEB_APP_URL con un origen permitido (localhost o *.saasrestaurant.app).',
    );
    return null;
  }
  return `${base}/station-login?sig=${encodeURIComponent(businessSig)}&station=${encodeURIComponent(stationId)}&branch=${encodeURIComponent(branchId)}`;
}

const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL || 'http://localhost:3000';

/**
 * Vista principal del POS desktop.
 * Carga la web app en un iframe con autenticación de estación vía URL param.
 *
 * Seguridad:
 *  - CSP definido en tauri.conf.json (frame-src, connect-src, etc.)
 *  - Sandbox restrictivo sin allow-popups
 *  - Validación de origen contra allowlist
 *  - encodeURIComponent en los parámetros de URL
 */
function PosView({ activation, onDeactivate }: PosViewProps): ReactNode {
  const [useBrowser, setUseBrowser] = useState(false);

  // Validar origen y construir URL segura
  const posUrl = buildPosUrl(
    WEB_APP_URL,
    activation.businessSig,
    activation.stationId,
    activation.branchId,
  );

  if (useBrowser) {
    if (!posUrl) {
      return <UnsafeUrlWarning onDeactivate={onDeactivate} />;
    }
    // Abrir en el navegador nativo del sistema vía Tauri shell plugin
    open(posUrl).catch(() => window.open(posUrl, '_blank', 'noopener,noreferrer'));
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="card p-6 text-center">
          <p className="mb-4 text-lg font-semibold text-slate-900">
            POS abierto en el navegador
          </p>
          <a
            href={posUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-600 underline"
          >
            {posUrl}
          </a>
          <div className="mt-6">
            <button
              className="btn-secondary"
              onClick={onDeactivate}
            >
              Desactivar estación
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Topbar */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500" title="Activo" />
          <span className="text-sm font-medium text-slate-700">
            Estación: {activation.stationId.slice(-6).toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200"
            onClick={() => setUseBrowser(true)}
          >
            Abrir en navegador
          </button>
          <button
            className="rounded-md bg-red-50 px-3 py-1 text-xs text-red-600 hover:bg-red-100"
            onClick={onDeactivate}
          >
            Desactivar
          </button>
        </div>
      </header>

      {/* Iframe al web app — sandbox restrictivo sin allow-popups */}
      {posUrl ? (
        <iframe
          src={posUrl}
          className="flex-1 border-0"
          title="SaaS Restaurant POS"
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      ) : (
        <UnsafeUrlWarning onDeactivate={onDeactivate} />
      )}
    </div>
  );
}

/**
 * Pantalla de error cuando la URL configurada no está en la allowlist.
 */
function UnsafeUrlWarning({ onDeactivate }: { onDeactivate: () => void }): ReactNode {
  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-lg">
        <div className="mb-4 text-4xl">🔒</div>
        <h2 className="mb-2 text-lg font-bold text-red-800">
          URL no permitida
        </h2>
        <p className="mb-6 text-sm text-red-600">
          La URL configurada en <code className="rounded bg-red-100 px-1">VITE_WEB_APP_URL</code> no está en la lista de
          orígenes permitidos. Verificá la configuración o contactá al administrador.
        </p>
        <button
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          onClick={onDeactivate}
        >
          Volver a activación
        </button>
      </div>
    </div>
  );
}

export { PosView };
