import type { HTMLAttributes } from 'react';

export type UiBadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: UiBadgeVariant;
}

const badgeVariants: Record<UiBadgeVariant, string> = {
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-red-100 text-red-800',
  neutral: 'bg-slate-100 text-slate-700',
  info: 'bg-brand-100 text-brand-800',
};

export function Badge({ variant = 'neutral', className = '', children, ...props }: BadgeProps) {
  return (
    <span className={['badge', badgeVariants[variant], className].filter(Boolean).join(' ')} {...props}>
      {children}
    </span>
  );
}
