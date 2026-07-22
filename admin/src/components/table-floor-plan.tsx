import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tablesApi, type RestaurantTable } from '~/lib/api';
import {
  TABLE_STATUS_LABELS,
  TABLE_LOCATION_LABELS,
  type TableStatus,
  type TableLocation,
} from '@saas/shared';

const LOCATION_ORDER: Record<string, number> = {
  INDOOR: 0,
  OUTDOOR: 1,
  BAR: 2,
  PATIO: 3,
  TERRACE: 4,
  OTHER: 5,
};

const STATUS_COLORS: Record<TableStatus, { bg: string; border: string; text: string }> = {
  FREE: {
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    border: 'border-emerald-300',
    text: 'text-emerald-700',
  },
  OCCUPIED: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-700',
  },
  RESERVED: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-700',
  },
};



// Icons as SVG paths
const LocationIcon = ({ location }: { location: string }) => {
  switch (location) {
    case 'OUTDOOR':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      );
    case 'BAR':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2h12l-2 10H8L6 2zM8 12v6a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-6" />
        </svg>
      );
    case 'PATIO':
    case 'TERRACE':
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 22L22 22M12 2v8M12 10L7 15M12 10L17 15" />
          <path d="M18 15v5M6 15v5" />
        </svg>
      );
    default:
      return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
  }
};

interface TableFloorPlanProps {
  branchId: string;
  selectedTableId: string | null;
  selectedTableNumber: string | null;
  onSelect: (tableId: string | null, tableNumber: string | null) => void;
}

/**
 * Floor plan visual de mesas para el POS.
 *
 * - Muestra las mesas de la sucursal organizadas por zona (location).
 * - Cada mesa tiene posX/posY opcionales → layout absoluto dentro de la zona.
 *   Si no tiene coordenadas, se auto-ordena en grid.
 * - Colores: FREE → verde, OCCUPIED → rojo, RESERVED → ámbar.
 * - Click en mesa FREE → selecciona (resaltada con anillo).
 * - Click en mesa ya seleccionada → deselecciona.
 * - Incluye leyenda de colores y contador de mesas libres/ocupadas.
 */
export function TableFloorPlan({
  branchId,
  selectedTableId,
  selectedTableNumber,
  onSelect,
}: TableFloorPlanProps): ReactNode {
  const queryClient = useQueryClient();
  const [activeLocation, setActiveLocation] = useState<string | null>(null);

  const tablesQuery = useQuery({
    queryKey: ['tables', 'floor-plan', branchId],
    queryFn: () => tablesApi.all(branchId, 1, 200),
    select: (res) => res.data,
    enabled: !!branchId,
    staleTime: 10_000,
  });

  const tables = tablesQuery.data ?? [];

  // Group tables by location + sort within groups
  const { grouped, locationKeys, summary } = useMemo(() => {
    const groups: Record<string, RestaurantTable[]> = {};
    let freeCount = 0;
    let occupiedCount = 0;
    let reservedCount = 0;

    for (const t of tables) {
      const loc = t.location ?? 'OTHER';
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(t);
      if (t.status === 'FREE') freeCount++;
      else if (t.status === 'OCCUPIED') occupiedCount++;
      else reservedCount++;
    }

    // Sort tables within each group
    for (const loc of Object.keys(groups)) {
      groups[loc].sort((a, b) => {
        // By posY first, then posX, then number
        if (a.posY !== null && b.posY !== null && a.posY !== b.posY) return a.posY - b.posY;
        if (a.posX !== null && b.posX !== null && a.posX !== b.posX) return a.posX - b.posX;
        return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
      });
    }

    const keys = Object.keys(groups).sort(
      (a, b) => (LOCATION_ORDER[a] ?? 99) - (LOCATION_ORDER[b] ?? 99),
    );

    return {
      grouped: groups,
      locationKeys: keys,
      summary: { freeCount, occupiedCount, reservedCount },
    };
  }, [tables]);

  // Auto-expand first location that has at least one FREE table
  useEffect(() => {
    if (!activeLocation && locationKeys.length > 0) {
      const firstWithFree = locationKeys.find((loc) =>
        grouped[loc].some((t) => t.status === 'FREE'),
      );
      setActiveLocation(firstWithFree ?? locationKeys[0]);
    }
  }, [locationKeys, grouped, activeLocation]);

  // Compute a bounding box for absolute-positioned tables in each zone
  const computeZoneBounds = (zoneTables: RestaurantTable[]) => {
    const withPos = zoneTables.filter((t) => t.posX !== null && t.posY !== null);
    if (withPos.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of withPos) {
      if (t.posX! < minX) minX = t.posX!;
      if (t.posY! < minY) minY = t.posY!;
      if (t.posX! > maxX) maxX = t.posX!;
      if (t.posY! > maxY) maxY = t.posY!;
    }
    return { minX, minY, maxX, maxY, rangeX: Math.max(maxX - minX, 1), rangeY: Math.max(maxY - minY, 1) };
  };

  const isLoading = tablesQuery.isLoading;
  const hasError = tablesQuery.isError;

  return (
    <div className="space-y-3">
      {/* Header + Mini Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="4" width="16" height="16" rx="2" />
            <path d="M4 10h16M10 4v16M14 4v16" />
          </svg>
          <h3 className="text-sm font-semibold text-slate-900">Plano de mesas</h3>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {summary.freeCount > 0 && (
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              {summary.freeCount} libre{summary.freeCount !== 1 ? 's' : ''}
            </span>
          )}
          {summary.occupiedCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
              {summary.occupiedCount} ocupada{summary.occupiedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => queryClient.invalidateQueries({ queryKey: ['tables', 'floor-plan', branchId] })}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refrescar
        </button>
      </div>

      {/* Selected table indicator */}
      {selectedTableId && selectedTableNumber && (
        <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            <span className="text-sm font-medium text-brand-800">
              Mesa {selectedTableNumber}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null, null)}
            className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Deseleccionar
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Cargando mesas…
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && !isLoading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
          <p className="text-xs text-red-600">Error al cargar mesas</p>
          <button
            type="button"
            onClick={() => queryClient.refetchQueries({ queryKey: ['tables', 'floor-plan', branchId] })}
            className="mt-2 rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Location zones */}
      {!isLoading && !hasError && locationKeys.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
          No hay mesas configuradas en esta sucursal
        </div>
      )}

      {!isLoading &&
        locationKeys.map((loc) => {
          const zoneTables = grouped[loc];
          const isActive = activeLocation === loc;
          const freeInZone = zoneTables.filter((t) => t.status === 'FREE').length;
          const bounds = computeZoneBounds(zoneTables);
          const hasCoordinates = zoneTables.some((t) => t.posX !== null && t.posY !== null);

          return (
            <div key={loc} className="overflow-hidden rounded-lg border border-slate-200">
              {/* Zone header (collapsible) */}
              <button
                type="button"
                onClick={() => setActiveLocation(isActive ? null : loc)}
                className="flex w-full items-center justify-between bg-slate-50 px-3 py-2 text-left hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LocationIcon location={loc} />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    {TABLE_LOCATION_LABELS[loc as TableLocation] ?? loc}
                  </span>
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                    {zoneTables.length}
                  </span>
                  {freeInZone > 0 && (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                      {freeInZone} libre{freeInZone !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <svg
                  className={`h-4 w-4 text-slate-400 transition-transform ${isActive ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Zone content */}
              {isActive && (
                <div className="p-3">
                  {hasCoordinates && bounds ? (
                    /* Absolute-positioned canvas-style layout */
                    <div
                      className="relative"
                      style={{
                        width: '100%',
                        aspectRatio: `${bounds.rangeX + 2} / ${bounds.rangeY + 2}`,
                        minHeight: '140px',
                      }}
                    >
                      {/* Grid background */}
                      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]">
                        <defs>
                          <pattern id={`grid-${loc}`} width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#grid-${loc})`} />
                      </svg>
                      {zoneTables.map((t) => {
                        const isSelected = selectedTableId === t.id;
                        const statusColor = STATUS_COLORS[t.status];
                        const left = t.posX !== null ? `${((t.posX! - bounds.minX + 1) / (bounds.rangeX + 2)) * 100}%` : 'auto';
                        const top = t.posY !== null ? `${((t.posY! - bounds.minY + 1) / (bounds.rangeY + 2)) * 100}%` : 'auto';
                        const isClickable = t.status === 'FREE';

                        return (
                          <button
                            key={t.id}
                            type="button"
                            disabled={!isClickable}
                            onClick={() => {
                              if (isSelected) onSelect(null, null);
                              else onSelect(t.id, t.number);
                            }}
                            className={`absolute flex flex-col items-center justify-center rounded-lg border-2 px-2 py-1.5 text-center text-xs transition-all ${
                              isClickable
                                ? `${statusColor.bg} ${statusColor.border} ${statusColor.text} cursor-pointer hover:scale-110 hover:shadow-md`
                                : `${statusColor.bg} ${statusColor.border} ${statusColor.text} cursor-default opacity-80`
                            } ${
                              isSelected
                                ? 'ring-2 ring-brand-500 ring-offset-2 scale-110 z-10'
                                : ''
                            }`}
                            style={{
                              left,
                              top,
                              transform: 'translate(-50%, -50%)',
                              minWidth: '56px',
                            }}
                            title={`Mesa ${t.number} · Cap. ${t.capacity} · ${TABLE_STATUS_LABELS[t.status]}`}
                          >
                            <span className="text-[11px] font-bold leading-tight">
                              {t.number}
                            </span>
                            <span className="text-[9px] opacity-75 leading-tight">
                              {t.capacity}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Auto-layout grid */
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                      {zoneTables.map((t) => {
                        const isSelected = selectedTableId === t.id;
                        const statusColor = STATUS_COLORS[t.status];
                        const isClickable = t.status === 'FREE';

                        return (
                          <button
                            key={t.id}
                            type="button"
                            disabled={!isClickable}
                            onClick={() => {
                              if (isSelected) onSelect(null, null);
                              else onSelect(t.id, t.number);
                            }}
                            className={`flex flex-col items-center justify-center rounded-lg border-2 px-2 py-2 text-center transition-all ${
                              isClickable
                                ? `${statusColor.bg} ${statusColor.border} ${statusColor.text} cursor-pointer hover:scale-105 hover:shadow-sm`
                                : `${statusColor.bg} ${statusColor.border} ${statusColor.text} cursor-default opacity-80`
                            } ${
                              isSelected
                                ? 'ring-2 ring-brand-500 ring-offset-2 scale-105'
                                : ''
                            }`}
                            title={`Mesa ${t.number} · Cap. ${t.capacity} · ${TABLE_STATUS_LABELS[t.status]}`}
                          >
                            <span className="text-sm font-bold">{t.number}</span>
                            <div className="flex items-center gap-1 text-[10px] opacity-75">
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                              </svg>
                              {t.capacity}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 rounded-md bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
        <span className="font-medium uppercase tracking-wider">Referencias</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-emerald-300 bg-emerald-50" />
          Libre
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-red-300 bg-red-50" />
          Ocupada
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-amber-300 bg-amber-50" />
          Reservada
        </span>
      </div>
    </div>
  );
}
