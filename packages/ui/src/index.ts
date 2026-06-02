/**
 * @saas/ui — Paquete de componentes compartidos.
 *
 * Phase 1: placeholder. Phase 2+ añadirá Button, Input, Modal, DataTable,
 * etc. con Tailwind y patrón container-presentational.
 *
 * Por ahora solo expone tipos de utilidad para mantener el contrato.
 */

export const UI_VERSION = '0.1.0';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  className?: string;
}
