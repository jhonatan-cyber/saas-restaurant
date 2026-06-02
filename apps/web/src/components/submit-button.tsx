import type { ReactNode } from 'react';

interface SubmitButtonProps {
  isSubmitting: boolean;
  /** Texto cuando NO está enviando */
  children: ReactNode;
  /** Texto mientras envía (default: "Guardando…") */
  loadingText?: string;
  /** Variante visual */
  variant?: 'primary' | 'secondary' | 'danger';
  /** Si true, el botón ocupa todo el ancho */
  fullWidth?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
}

/**
 * Botón de submit con estado de carga.
 * Centraliza el patrón "disabled mientras submit" para que no se nos olvide
 * en ningún form.
 */
export function SubmitButton({
  isSubmitting,
  children,
  loadingText = 'Guardando…',
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'submit',
}: SubmitButtonProps): ReactNode {
  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'danger'
        ? 'btn-danger'
        : 'btn-secondary';

  return (
    <button
      type={type}
      className={`${variantClass} ${fullWidth ? 'w-full' : ''}`}
      disabled={isSubmitting || disabled}
      onClick={onClick}
    >
      {isSubmitting ? loadingText : children}
    </button>
  );
}
