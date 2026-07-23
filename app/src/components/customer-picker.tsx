import { useState, useRef, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, type Customer } from '~/lib/api';
import { useBarcodeCamera } from '~/lib/use-barcode-camera';
import { OrbSpinner } from '@saas/ui';
import { SearchIcon, BarcodeIcon, CloseIcon, PlusSmallIcon, ChevronDownSolidIcon, UserIcon } from './icons';

interface CustomerPickerProps {
  selectedCustomerId: string | null;
  selectedCustomerName: string | null;
  onSelect: (customerId: string | null, customerName: string | null) => void;
}

/** Minimum query length to trigger search */
const MIN_SEARCH_LENGTH = 2;
/** Debounce delay in ms */
const DEBOUNCE_MS = 300;

/**
 * Customer Picker para el POS.
 *
 * - Búsqueda por nombre, email, teléfono o NIT con debounce de 300ms.
 * - Muestra hasta 8 resultados en un dropdown.
 * - Al seleccionar, actualiza el store con customerId + customerName.
 * - Botón "Crear nuevo cliente" que despliega un mini-formulario inline.
 * - También permite quitar la selección actual.
 */
export function CustomerPicker({
  selectedCustomerId,
  selectedCustomerName,
  onSelect,
}: CustomerPickerProps): ReactNode {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Quick-create form state
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTaxId, setNewTaxId] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Camera scan state
  const [scanning, setScanning] = useState(false);
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const { state: camState, start: startCam, stop: stopCam, reset: resetCam, videoRef } = useBarcodeCamera();

  // Search function (definida antes del useEffect que la referencia)
  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setSearchError(null);
    try {
      const data = await customersApi.search(trimmed, 8);
      setResults(data);
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Error al buscar');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // When barcode is detected, auto-fill search and trigger immediate search.
  useEffect(() => {
    if (camState.status === 'detected') {
      const val = camState.value;
      setScannedValue(val);
      setQuery(val);
      doSearch(val);
    }
  }, [camState, doSearch]);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; phone?: string; email?: string; taxId?: string }) =>
      customersApi.create({
        name: data.name,
        phone: data.phone || undefined,
        email: data.email || undefined,
        taxId: data.taxId || undefined,
        isActive: true,
      }),
    onSuccess: (customer) => {
      onSelect(customer.id, customer.name);
      resetCreateForm();
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: Error) => {
      setCreateError(err.message);
    },
  });

  // Debounced search when query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length >= MIN_SEARCH_LENGTH) {
      debounceRef.current = setTimeout(() => doSearch(query), DEBOUNCE_MS);
    } else {
      setResults([]);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Camera handlers
  const handleStartScan = async (): Promise<void> => {
    setScanning(true);
    setScannedValue(null);
    await startCam();
  };

  const handleStopScan = (): void => {
    setScanning(false);
    setScannedValue(null);
    resetCam();
  };

  const handleUseScannedValue = (): void => {
    if (scannedValue) {
      // Pre-fill create form with scanned taxId
      setShowCreate(true);
      setNewTaxId(scannedValue);
      setScannedValue(null);
    }
  };

  const resetCreateForm = (): void => {
    setShowCreate(false);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewTaxId('');
    setCreateError(null);
    setQuery('');
  };

  const handleCreate = (): void => {
    const name = newName.trim();
    if (!name) {
      setCreateError('El nombre es obligatorio');
      return;
    }
    setCreateError(null);
    createMutation.mutate({
      name,
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
      taxId: newTaxId.trim() || undefined,
    });
  };

  const handleSelect = (customer: Customer): void => {
    onSelect(customer.id, customer.name);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleClear = (): void => {
    onSelect(null, null);
    setQuery('');
    setResults([]);
    setOpen(true);
    inputRef.current?.focus();
  };

  // Focus input when opening
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  return (
    <div className="relative">
      {/* Selected customer chip */}
      {selectedCustomerId && selectedCustomerName ? (
        <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <UserIcon className="h-4 w-4 shrink-0 text-brand-600" />
            <span className="truncate text-sm font-medium text-brand-800">
              {selectedCustomerName}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-100 transition-colors"
              aria-label="Cambiar cliente"
            >
              Cambiar
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
              aria-label="Quitar cliente"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        /* Search button (no customer selected) */
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors"
        >
          <span className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Cliente (opcional)
          </span>
          <ChevronDownSolidIcon className="h-4 w-4" />
        </button>
      )}

      {/* Dropdown panel */}
      {open && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {/* Search input with camera button */}
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setOpen(false);
                }}
                placeholder="Buscar por nombre, NIT, email…"
                className="w-full rounded-md border border-slate-200 py-2 pl-8 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
              />
              {/* Camera scan button */}
              <button
                type="button"
                onClick={handleStartScan}
                disabled={camState.status === 'starting'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 disabled:opacity-50 transition-colors"
                title="Escanear NIT/cédula con cámara"
                aria-label="Escanear código de barras o QR"
              >
                <BarcodeIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Camera viewfinder (shown when scanning) */}
          {scanning && (
            <div className="relative">
              {/* Video feed */}
              <div className="relative aspect-video w-full overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 h-full w-full object-cover"
                />
                {/* Scan area indicator */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative h-3/5 w-4/5">
                    {/* Corner brackets */}
                    <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-white/80" />
                    <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-white/80" />
                    <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-white/80" />
                    <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-white/80" />
                  </div>
                </div>
                {/* Scanning animation line */}
                <div className="absolute left-[10%] right-[10%] top-1/2 h-0.5 animate-pulse bg-brand-400 shadow-lg shadow-brand-500/50" />
              </div>

              {/* Status overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
                <p className="text-center text-xs text-white/90">
                  {camState.status === 'starting' && 'Iniciando cámara…'}
                  {camState.status === 'active' && 'Apunte al código de barras o QR'}
                  {camState.status === 'detected' && `Detectado: ${camState.value}`}
                  {camState.status === 'error' && `Error: ${camState.message}`}
                  {camState.status === 'unsupported' && 'Cámara no disponible en este navegador'}
                </p>
              </div>

              {/* Close / back button */}
              <button
                type="button"
                onClick={handleStopScan}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white/80 hover:bg-black/70 hover:text-white transition-colors"
                aria-label="Cerrar escáner"
              >
                <CloseIcon className="h-4 w-4" />
              </button>

              {/* Error actions */}
              {camState.status === 'error' && (
                <div className="flex items-center justify-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={handleStopScan}
                    className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300 transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleStartScan}
                    className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {/* Unsupported message */}
              {camState.status === 'unsupported' && (
                <div className="px-3 py-2">
                  <p className="text-center text-xs text-slate-500">
                    Tu navegador no soporta escaneo con cámara. Usá Chrome en escritorio o Android.
                  </p>
                  <button
                    type="button"
                    onClick={handleStopScan}
                    className="mx-auto mt-1 block rounded-md bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300 transition-colors"
                  >
                    Volver
                  </button>
                </div>
              )}

              {/* Detected value actions */}
              {camState.status === 'detected' && (
                <div className="flex items-center justify-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Auto-trigger search, close camera
                      handleStopScan();
                    }}
                    className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-300 transition-colors"
                  >
                    Buscar en resultados
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleUseScannedValue();
                      handleStopScan();
                    }}
                    className="rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
                  >
                    Crear cliente con este NIT
                  </button>
                </div>
              )}

              {/* Success sound visual feedback */}
              {camState.status === 'detected' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="animate-ping rounded-full border-2 border-green-400 bg-green-400/20 h-16 w-16" />
                </div>
              )}
            </div>
          )}

          {/* Results */}
          <div className="max-h-56 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center gap-2 px-3 py-4 text-xs text-slate-500">
                <OrbSpinner size={20} state="searching" speed={3.00} />
                Buscando…
              </div>
            )}

            {searchError && (
              <div className="px-3 py-3 text-xs text-red-600">{searchError}</div>
            )}

            {!loading && !searchError && query.trim().length >= MIN_SEARCH_LENGTH && results.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-slate-500">
                Sin resultados. Podés crear un cliente nuevo abajo.
              </div>
            )}

            {!loading &&
              results.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-50 ${
                    selectedCustomerId === c.id ? 'bg-brand-50' : ''
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{c.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {[c.phone, c.email, c.taxId].filter(Boolean).join(' · ') || 'Sin contacto'}
                    </p>
                  </div>
                  {c.totalOrders > 0 && (
                    <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {c.totalOrders} ord.
                    </span>
                  )}
                </button>
              ))}
          </div>

          {/* Quick create or footer */}
          <div className="border-t border-slate-100 p-2">
            {showCreate ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-700">Nuevo cliente</p>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nombre *"
                  className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Teléfono"
                    className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                  />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                  />
                </div>
                <input
                  type="text"
                  value={newTaxId}
                  onChange={(e) => setNewTaxId(e.target.value)}
                  placeholder="NIT / CI"
                  className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/15"
                />
                {createError && (
                  <p className="text-xs text-red-600">{createError}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="flex-1 rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {createMutation.isPending ? 'Creando…' : 'Crear y asignar'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-brand-700 hover:bg-brand-50 transition-colors"
              >
                <PlusSmallIcon className="h-3.5 w-3.5" />
                Crear nuevo cliente
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
