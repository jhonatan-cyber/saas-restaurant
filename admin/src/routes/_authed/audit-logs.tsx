import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { adminApi } from '~/lib';
import { RoutePending, Skeleton } from '~/components';
import { Pagination } from '~/components/ui';

export const Route = createFileRoute('/_authed/audit-logs')({
  component: AuditLogsPage,
  pendingComponent: RoutePending,
});

const PAGE_SIZE = 30;

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'text-green-400 bg-green-900/30 border-green-800',
  UPDATE: 'text-blue-400 bg-blue-900/30 border-blue-800',
  DELETE: 'text-red-400 bg-red-900/30 border-red-800',
  LOGIN: 'text-purple-400 bg-purple-900/30 border-purple-800',
  SUSPEND: 'text-amber-400 bg-amber-900/30 border-amber-800',
  ACTIVATE: 'text-emerald-400 bg-emerald-900/30 border-emerald-800',
};

function AuditLogsPage(): ReactNode {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', { page, action: actionFilter, entity: entityFilter }],
    queryFn: () => adminApi.listAuditLogs({
      page,
      pageSize: PAGE_SIZE,
      action: actionFilter || undefined,
      entity: entityFilter || undefined,
    }),
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Auditoría</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todas las acciones</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
          <option value="SUSPEND">SUSPEND</option>
          <option value="ACTIVATE">ACTIVATE</option>
        </select>

        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
        >
          <option value="">Todas las entidades</option>
          <option value="business">Negocio</option>
          <option value="user">Usuario</option>
          <option value="subscription">Suscripción</option>
          <option value="plan">Plan</option>
          <option value="branch">Sucursal</option>
        </select>
      </div>

      <Skeleton name="audit-logs-table" loading={isLoading}>
        {data && (
          <>
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Acción</th>
                    <th className="px-4 py-3">Entidad</th>
                    <th className="px-4 py-3">ID Entidad</th>
                    <th className="px-4 py-3">Usuario</th>
                    <th className="px-4 py-3">Negocio</th>
                    <th className="px-4 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {data.data.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                        No hay logs de auditoría.
                      </td>
                    </tr>
                  )}
                  {data.data.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] || 'text-zinc-400'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{log.entity}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">{log.entityId}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">{log.userId}</td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-400">{log.businessId}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              onPageChange={setPage}
            />
          </>
        )}
      </Skeleton>
    </div>
  );
}
