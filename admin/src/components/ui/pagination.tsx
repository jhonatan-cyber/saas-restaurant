import type { ReactNode } from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onPageChange }: PaginationProps): ReactNode {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
      {total !== undefined && (
        <span>{total} registros · Página {page} de {totalPages}</span>
      )}
      {total === undefined && (
        <span>Página {page} de {totalPages}</span>
      )}
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded border border-zinc-700 px-3 py-1 text-xs hover:bg-zinc-800 disabled:opacity-40"
        >
          Anterior
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded border border-zinc-700 px-3 py-1 text-xs hover:bg-zinc-800 disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}