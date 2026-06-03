import { useState, useEffect, type ReactNode } from 'react';
import { ActivationScreen } from './components/activation-screen';
import { PosView } from './components/pos-view';

interface ActivationData {
  businessSig: string; // firma/business identifier
  branchId: string;
  stationId: string;
}

const STORAGE_KEY = 'saas_pos_activation';

function App(): ReactNode {
  const [activation, setActivation] = useState<ActivationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setActivation(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const handleActivate = (data: ActivationData): void => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    setActivation(data);
  };

  const handleDeactivate = (): void => {
    localStorage.removeItem(STORAGE_KEY);
    setActivation(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Iniciando…</p>
      </div>
    );
  }

  if (!activation) {
    return <ActivationScreen onActivate={handleActivate} />;
  }

  return (
    <PosView
      activation={activation}
      onDeactivate={handleDeactivate}
    />
  );
}

export { App };
