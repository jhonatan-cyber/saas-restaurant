import { useState, type ReactNode } from 'react';

interface PosViewProps {
  activation: {
    businessSig: string;
    branchId: string;
    stationId: string;
  };
  onDeactivate: () => void;
}

const WEB_APP_URL = import.meta.env.VITE_WEB_APP_URL || 'http://localhost:3000';

/**
 * Vista principal del POS desktop.
 * Carga la web app en un iframe con headers de autenticación de estación.
 * También puede abrir en navegador nativo si el Tauri webview no carga
 * correctamente la app.
 */
function PosView({ activation, onDeactivate }: PosViewProps): ReactNode {
  const [useBrowser, setUseBrowser] = useState(false);

  // Construimos la URL con el código de estación como query param
  const posUrl = `${WEB_APP_URL}/pos?station=${activation.stationId}&branch=${activation.branchId}&sig=${activation.businessSig}`;

  if (useBrowser) {
    // Intentar abrir en navegador nativo
    window.open(posUrl, '_blank');
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

      {/* Iframe al web app */}
      <iframe
        src={posUrl}
        className="flex-1 border-0"
        title="SaaS Restaurant POS"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}

export { PosView };
