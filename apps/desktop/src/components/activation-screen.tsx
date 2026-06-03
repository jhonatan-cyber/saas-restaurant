import { useState, type ReactNode } from 'react';
import type { FormEvent } from 'react';

interface ActivationScreenProps {
  onActivate: (data: {
    businessSig: string;
    branchId: string;
    stationId: string;
  }) => void;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Pantalla de activación de estación POS.
 * Sin Tailwind — usa inline styles (la desktop app es standalone sin Tailwind).
 */
function ActivationScreen({ onActivate }: ActivationScreenProps): ReactNode {
  const [businessSlug, setBusinessSlug] = useState('');
  const [stationCode, setStationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!businessSlug.trim() || !stationCode.trim()) {
      setError('Completá todos los campos');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pos-stations/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug: businessSlug.trim(),
          stationCode: stationCode.trim(),
          deviceName: navigator.platform,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message ?? 'Error de activación');
      }

      const data = await res.json();
      onActivate({
        businessSig: data.businessSig,
        branchId: data.branchId,
        stationId: data.stationId,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const s = styles;

  return (
    <div style={s.wrapper}>
      <div style={s.card}>
        <div style={s.logoWrap}>
          <div style={s.logo}>🏪</div>
        </div>
        <h1 style={s.title}>Activar Estación POS</h1>
        <p style={s.subtitle}>
          Ingresá el código de activación que te dio el administrador.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={s.field}>
            <label style={s.label}>Slug del negocio</label>
            <input
              type="text"
              style={s.input}
              placeholder="ej. mi-restaurante"
              value={businessSlug}
              onChange={(e) => setBusinessSlug(e.target.value)}
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Código de estación</label>
            <input
              type="text"
              style={{ ...s.input, ...s.codeInput }}
              maxLength={8}
              placeholder="• • • • • •"
              value={stationCode}
              onChange={(e) => setStationCode(e.target.value.toUpperCase())}
            />
            <p style={s.hint}>Pedí el código al administrador del sistema.</p>
          </div>

          {error && <div style={s.errorBox}>{error}</div>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...s.btn,
              ...(loading ? s.btnDisabled : {}),
            }}
          >
            {loading ? 'Activando…' : 'Activar estación'}
          </button>
        </form>
      </div>
    </div>
  );
}

export { ActivationScreen };

// ============ Inline styles ============

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: 'linear-gradient(135deg, #0f172a, #334155)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#fff',
    borderRadius: 16,
    padding: 32,
    boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
  },
  logoWrap: {
    textAlign: 'center',
    marginBottom: 16,
  },
  logo: {
    display: 'inline-flex',
    width: 64,
    height: 64,
    borderRadius: 16,
    background: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: '#0f172a',
    textAlign: 'center',
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#334155',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    boxSizing: 'border-box',
    outline: 'none',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 8,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  errorBox: {
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: 13,
    padding: '8px 12px',
    borderRadius: 8,
    marginBottom: 12,
  },
  btn: {
    width: '100%',
    padding: '10px 16px',
    fontSize: 14,
    fontWeight: 600,
    color: '#fff',
    background: '#059669',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'default',
  },
};
