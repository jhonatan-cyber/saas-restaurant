import type { ReactNode } from 'react';
import { useEffect } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal de confirmación simple (sin librería externa).
 *  - Cierra con ESC.
 *  - Click en backdrop cancela.
 *  - variant=danger usa colores rojos (default).
 *
 * Pensado para confirmar deletes y cambios de estado importantes.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): ReactNode {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !isLoading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, isLoading, onCancel]);

  if (!open) return null;

  const confirmClass = variant === 'danger' ? 'btn-danger' : 'btn-primary';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
      onClick={isLoading ? undefined : onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="card w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="mt-2 text-sm text-slate-600">{message}</div>
        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={confirmClass}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Procesando…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
