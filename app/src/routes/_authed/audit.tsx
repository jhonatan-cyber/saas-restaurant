import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { auditApi, type AuditLogEntry } from '~/lib/api';
import { RoutePending, Skeleton } from '~/components';

export const Route = createFileRoute('/_authed/audit')({
  component: AuditLogPage,
  pendingComponent: RoutePending,
});

const PAGE_SIZE = 30;

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-green-700 bg-green-100',
  UPDATE: 'text-blue-700 bg-blue-100',
  DELETE: 'text-red-700 bg-red-100',
  LOGIN: 'text-purple-700 bg-purple-100',
};

function AuditLogPage(): ReactNode {
  const [page, setPage] = useState(1);

  const listQuery = useQuery({
    queryKey: ['audit-logs', { page }],
    queryFn: () => auditApi.list({ page, pageSize: PAGE_SIZE }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Auditoría</h1>
        <p className="text-sm text-slate-500 mt-1">
          Registro de acciones realizadas en el sistema.
        </p>
      </div>

      <div className="card overflow-hidden">
        <Skeleton name="audit-table" loading={listQuery.isLoading}>
          {listQuery.error ? (
            <div className="p-8 text-center text-red-600">Error: {String(listQuery.error)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Acción</th>
                    <th className="px-4 py-3">Entidad</th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {listQuery.data?.data.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        Sin registros de auditoría.
                      </td>
                    </tr>
                  )}
                  {listQuery.data?.data.map((log: AuditLogEntry) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] || 'text-slate-500 bg-slate-100'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{log.entity}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.entityId}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{log.userId}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Skeleton>
      </div>

      {listQuery.data && listQuery.data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Página {listQuery.data.meta.page} de {listQuery.data.meta.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary px-3 py-1"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <button
              className="btn-secondary px-3 py-1"
              disabled={page === listQuery.data.meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
