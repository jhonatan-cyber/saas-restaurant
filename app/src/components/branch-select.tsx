import { useQuery } from '@tanstack/react-query';
import { branchesApi, type Branch } from '~/lib/api';

interface BranchSelectProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Selector de sucursal que carga las sucursales activas desde la API.
 * Usado en formularios donde se puede filtrar por sucursal.
 *
 * - value: string (id de sucursal o '' para "todas")
 * - onChange: callback con el id seleccionado
 */
export function BranchSelect({ value, onChange }: BranchSelectProps) {
  const branchesQuery = useQuery({
    queryKey: ['branches', 'active'],
    queryFn: () => branchesApi.list({ pageSize: 100 }),
  });

  const branches: Branch[] = branchesQuery.data?.data ?? [];

  return (
    <select
      id="branchId"
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Todas las sucursales</option>
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name} ({b.code})
        </option>
      ))}
    </select>
  );
}
