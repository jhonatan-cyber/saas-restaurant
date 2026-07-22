import { useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface BulkPricingTier {
  minQty: number;
  unitPrice: number;
}

interface BulkPricingEditorProps {
  tiers: BulkPricingTier[];
  basePrice: number;
  onChange: (tiers: BulkPricingTier[]) => void;
}

/**
 * Editor de precios por cantidad (F5-02).
 * Se muestra cuando el producto tiene configurados escalones de precio.
 * Permite agregar/quitar escalones con cantidad mínima y precio unitario.
 */
export function BulkPricingEditor({ tiers, basePrice, onChange }: BulkPricingEditorProps): ReactNode {
  const [newMinQty, setNewMinQty] = useState<number>(2);
  const [newUnitPrice, setNewUnitPrice] = useState<number>(0);

  const handleAdd = useCallback(() => {
    if (newMinQty < 2) return;
    if (newUnitPrice <= 0) return;
    if (newUnitPrice >= basePrice) {
      alert('El precio por cantidad debe ser menor al precio base');
      return;
    }
    // Verificar que no se duplique minQty
    if (tiers.some((t) => t.minQty === newMinQty)) return;
    // Verificar orden ascendente
    const sorted = [...tiers, { minQty: newMinQty, unitPrice: newUnitPrice }].sort(
      (a, b) => a.minQty - b.minQty,
    );
    onChange(sorted);
    setNewMinQty(Math.min(newMinQty + 2, 100));
    setNewUnitPrice(0);
  }, [newMinQty, newUnitPrice, basePrice, tiers, onChange]);

  const handleRemove = useCallback(
    (minQty: number) => {
      onChange(tiers.filter((t) => t.minQty !== minQty));
    },
    [tiers, onChange],
  );

  const handleEdit = useCallback(
    (minQty: number, field: 'minQty' | 'unitPrice', value: number) => {
      onChange(
        tiers.map((t) => (t.minQty === minQty ? { ...t, [field]: value } : t)),
      );
    },
    [tiers, onChange],
  );

  // Calcular savings para cada escalón
  const savings = (tier: BulkPricingTier): string => {
    const saving = basePrice - tier.unitPrice;
    return `(ahorro Bs ${saving.toFixed(2)} c/u)`;
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Precio por cantidad</h3>
          <p className="text-xs text-slate-500">
            Precio base: Bs {basePrice.toFixed(2)}. Definí precios especiales para pedidos al por mayor.
          </p>
        </div>
      </div>

      {/* Lista de escalones actuales */}
      {tiers.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">
          Sin precios por cantidad configurados. Agregá escalones debajo.
        </p>
      ) : (
        <div className="space-y-2 mb-4">
          {tiers.map((tier) => (
            <div
              key={tier.minQty}
              className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">Desde</span>
                  <input
                    type="number"
                    min={2}
                    value={tier.minQty}
                    onChange={(e) => handleEdit(tier.minQty, 'minQty', Number(e.target.value))}
                    className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm text-center"
                  />
                  <span className="text-sm text-slate-500">uds.</span>
                  <span className="text-sm font-medium text-slate-900">a Bs</span>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={tier.unitPrice}
                    onChange={(e) => handleEdit(tier.minQty, 'unitPrice', Number(e.target.value))}
                    className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm text-center"
                  />
                  <span className="text-xs text-green-600 font-medium">
                    {savings(tier)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(tier.minQty)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
                aria-label="Quitar escalón"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Agregar nuevo escalón */}
      <div className="rounded-md border border-dashed border-slate-300 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Agregar escalón
        </p>
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Mínimo unidades</label>
            <input
              type="number"
              min={2}
              value={newMinQty}
              onChange={(e) => setNewMinQty(Number(e.target.value))}
              className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-center"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Precio unitario (Bs)</label>
            <input
              type="number"
              min={0.01}
              step={0.01}
              value={newUnitPrice || ''}
              onChange={(e) => setNewUnitPrice(Number(e.target.value))}
              placeholder={basePrice.toFixed(2)}
              className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={newMinQty < 2 || newUnitPrice <= 0 || newUnitPrice >= basePrice}
            className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Agregar
          </button>
        </div>
        {newUnitPrice > 0 && newUnitPrice >= basePrice && (
          <p className="mt-1 text-xs text-red-500">
            El precio por cantidad debe ser menor al precio base (Bs {basePrice.toFixed(2)})
          </p>
        )}
      </div>

      {tiers.length > 0 && (
        <p className="mt-2 text-xs text-slate-400">
          {tiers.length} escalón(es) de precio configurado(s)
        </p>
      )}
    </div>
  );
}
