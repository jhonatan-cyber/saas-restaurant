import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { auditApi, ApiClientError, type AuditFilters, type AuditLogEntry } from '../../lib/api';
import { AuditAction, AUDIT_ACTION_LABELS, AUDIT_ACTION_VALUES } from '@saas/shared';

export const Route = createFileRoute('/_authed/audit')({
  component: AuditListPage,
});

const PAGE_SIZE = 30;
const ENTITIES = ['Product', 'Order', 'Shift', 'CashMovement', 'Payment', 'User', 'Business', 'Branch', 'Supplier', 'Purchase', 'Report'];

function AuditListPage(): ReactNode {
  const [filters, setFilters] = useState<AuditFilters>({
    page: 1,
    pageSize: PAGE_SIZE,
    entity: undefined,
    action: undefined,
  });

  const listQuery = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditApi.list(filters),
  });

  const formatDate = (d: string): string =>
    new Date(d).toLocaleString('es-AR');

  const shortenId = (id: string): string => id.length > 12 ? `${id.slice(0, 12)}...` : id;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Auditoría</h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro de todas las acciones realizadas en el sistema
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Entidad</label>
            <select
              className="input"
              value={filters.entity ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, entity: e.target.value || undefined, page: 1 }))}
            >
              <option value="">Todas</option>
              {ENTITIES.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-500">Acción</label>
            <select
              className="input"
              value={filters.action ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value || undefined, page: 1 }))}
            >
              <option value="">Todas</option>
              {AUDIT_ACTION_VALUES.map((a) => (
                <option key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        {listQuery.isLoading ? (
          <div className="p-8 text-center text-slate-500">Cargando...</div>
        ) : listQuery.isError ? (
          <div className="p-8 text-center text-red-500">
            Error: {listQuery.error instanceof ApiClientError ? listQuery.error.message : 'Error desconocido'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Entidad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {listQuery.data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No hay registros de auditoría
                    </td>
                  </tr>
                ) : (
                  listQuery.data?.data.map((entry: AuditLogEntry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                        {shortenId(entry.userId)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {entry.entity}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500 font-mono">
                        {shortenId(entry.entityId)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getActionColor(entry.action)}`}>
                          {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {listQuery.data?.meta && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <div className="text-sm text-slate-500">
              Pág. {listQuery.data.meta.page} de {listQuery.data.meta.totalPages} ({listQuery.data.meta.total} registros)
            </div>
            <div className="flex gap-2">
              <button
                className="btn-secondary text-sm"
                disabled={listQuery.data.meta.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page! - 1 }))}
              >
                Anterior
              </button>
              <button
                className="btn-secondary text-sm"
                disabled={listQuery.data.meta.page >= listQuery.data.meta.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page! + 1 }))}
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

/** Color de badge según tipo de acción */
function getActionColor(action: string): string {
  switch (action) {
    case AuditAction.CREATE:
      return 'bg-green-50 text-green-700';
    case AuditAction.UPDATE:
    case AuditAction.PRICE_CHANGE:
    case AuditAction.DISCOUNT:
      return 'bg-blue-50 text-blue-700';
    case AuditAction.SOFT_DELETE:
    case AuditAction.HARD_DELETE:
    case AuditAction.VOID:
      return 'bg-red-50 text-red-700';
    case AuditAction.SHIFT_OPEN:
    case AuditAction.SHIFT_CLOSE:
    case AuditAction.SHIFT_ARQUEO:
    case AuditAction.CASH_MOVEMENT:
    case AuditAction.PAYMENT:
      return 'bg-amber-50 text-amber-700';
    case AuditAction.STATION_ACTIVATE:
    case AuditAction.STATION_DEACTIVATE:
      return 'bg-purple-50 text-purple-700';
    default:
      return 'bg-slate-50 text-slate-700';
  }
}
