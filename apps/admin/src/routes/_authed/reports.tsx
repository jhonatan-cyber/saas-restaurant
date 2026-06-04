import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { reportsApi, ReportType, ReportFormat, ReportStatus, type ReportFilters } from '~/lib/api';
import { StatusBadge } from '~/components/status-badge';

export const Route = createFileRoute('/_authed/reports')({
  component: ReportsPage,
});

const REPORT_LABELS: Record<string, string> = {
  SALES_DAILY: 'Ventas del día',
  SALES_RANGE: 'Ventas por rango',
  PAYMENT_METHODS: 'Métodos de pago',
  TOP_PRODUCTS: 'Productos más vendidos',
  GROSS_PROFIT: 'Utilidad bruta',
  INVENTORY: 'Inventario',
  CLOSE_REPORT: 'Reporte de cierre',
};

const FORMAT_LABELS: Record<string, string> = {
  PDF: 'PDF',
  XLSX: 'Excel',
};

const STATUS_VARIANTS: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
  PENDING: 'info',
  PROCESSING: 'warning',
  COMPLETED: 'success',
  FAILED: 'danger',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Generando…',
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function ReportsPage(): ReactNode {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ReportFilters>({ page: 1, pageSize: 20 });
  const [showRequestForm, setShowRequestForm] = useState(false);

  const listQuery = useQuery({
    queryKey: ['reports', 'list', filters],
    queryFn: () => reportsApi.list(filters),
    // Auto-refresh cada 5s si hay reportes pendientes o procesando
    refetchInterval: (query) => {
      const data = query.state.data?.data;
      if (!data) return 5000;
      const hasPending = data.some(
        (r) => r.status === 'PENDING' || r.status === 'PROCESSING',
      );
      return hasPending ? 3000 : false;
    },
  });

  const requestMutation = useMutation({
    mutationFn: reportsApi.request,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', 'list'] });
      setShowRequestForm(false);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes</h1>
          <p className="text-sm text-slate-500 mt-1">Solicitar y descargar reportes del sistema</p>
        </div>
        <button className="btn-primary" onClick={() => setShowRequestForm(true)}>
          + Nuevo reporte
        </button>
      </div>

      {/* Modal de solicitud */}
      {showRequestForm && (
        <RequestReportForm
          onSubmit={(data) => requestMutation.mutate(data)}
          onCancel={() => setShowRequestForm(false)}
          isLoading={requestMutation.isPending}
        />
      )}

      {/* Lista de reportes */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Formato</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Tamaño</th>
                <th className="px-4 py-3">Solicitado</th>
                <th className="px-4 py-3">Completado</th>
                <th className="px-4 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {listQuery.isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Cargando…</td>
                </tr>
              )}
              {listQuery.data?.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No hay reportes aún.
                  </td>
                </tr>
              )}
              {listQuery.data?.data.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {REPORT_LABELS[r.type] ?? r.type}
                  </td>
                  <td className="px-4 py-3">{FORMAT_LABELS[r.format] ?? r.format}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        label={STATUS_LABELS[r.status] ?? r.status}
                        variant={STATUS_VARIANTS[r.status] ?? 'neutral'}
                      />
                      {r.status === 'PROCESSING' && (
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {r.resultSize != null ? formatBytes(r.resultSize) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {r.completedAt ? new Date(r.completedAt).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'COMPLETED' && r.resultUrl && (
                      <a
                        href={r.resultUrl}
                        className="text-brand-600 hover:text-brand-700 text-xs font-medium"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Descargar
                      </a>
                    )}
                    {r.status === 'FAILED' && (
                      <span
                        className="text-xs text-red-600 cursor-help"
                        title={r.errorMessage ?? 'Error desconocido'}
                      >
                        Error
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {listQuery.data && listQuery.data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <p className="text-slate-600">
              Página {listQuery.data.meta.page} de {listQuery.data.meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                className="btn-secondary px-3 py-1"
                disabled={filters.page === 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
              >
                Anterior
              </button>
              <button
                className="btn-secondary px-3 py-1"
                disabled={filters.page === listQuery.data.meta.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RequestReportForm({
  onSubmit,
  onCancel,
  isLoading,
}: {
  onSubmit: (data: { type: ReportType; format?: ReportFormat }) => void;
  onCancel: () => void;
  isLoading: boolean;
}): ReactNode {
  const [type, setType] = useState<string>('');
  const [format, setFormat] = useState<ReportFormat>(ReportFormat.PDF);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!type) return;
    onSubmit({ type: type as ReportType, format });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Solicitar reporte</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de reporte</label>
            <select
              className="input w-full"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              <option value="">Seleccionar…</option>
              {Object.entries(REPORT_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Formato</label>
            <select
              className="input w-full"
              value={format}
              onChange={(e) => setFormat(e.target.value as ReportFormat)}
            >
              <option value={ReportFormat.PDF}>PDF</option>
              <option value={ReportFormat.XLSX}>Excel (XLSX)</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={!type || isLoading}>
              {isLoading ? 'Solicitando…' : 'Solicitar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
