import { ThinkingOrb } from 'thinking-orbs';
import type { ComponentProps } from 'react';

type ThinkingOrbProps = ComponentProps<typeof ThinkingOrb>;

export interface OrbSpinnerProps {
  /** Tamaño: 64 (full-page/avatar) o 20 (inline/button). Default 64. */
  size?: 20 | 64 | (number & {});
  /** Estado de animación. Default "working" */
  state?: ThinkingOrbProps['state'];
  /** Tema: "auto" | "dark" | "light". Default "auto" (detecta del proyecto) */
  theme?: ThinkingOrbProps['theme'];
  /** Multiplicador de velocidad. Default 1 */
  speed?: number;
  /** Mensaje accesible (aria-label). Default según estado */
  'aria-label'?: string;
  /** Clases CSS adicionales (se pasan al <canvas>) */
  className?: string;
  /** Pausar animación */
  paused?: boolean;
}

/**
 * OrbSpinner — spinner uniforme para todo el sistema.
 *
 * Wrapper sobre `thinking-orbs` con defaults pensados para
 * el stack del SaaS (dark theme, estados productivos).
 *
 * @example
 * // Full-page loading
 * <div className="flex min-h-screen items-center justify-center bg-zinc-950">
 *   <OrbSpinner size={64} state="searching" />
 * </div>
 *
 * @example
 * // Inline en botón
 * <button disabled><OrbSpinner size={20} /> Procesando…</button>
 */
export function OrbSpinner({
  size = 64,
  state = 'working',
  theme = 'auto',
  speed = 1,
  'aria-label': ariaLabel,
  className,
  paused,
}: OrbSpinnerProps) {
  return (
    <ThinkingOrb
      state={state}
      size={size as any}
      theme={theme}
      speed={speed}
      aria-label={ariaLabel ?? defaultAriaLabel(state)}
      className={className}
      paused={paused}
    />
  );
}

function defaultAriaLabel(state: NonNullable<OrbSpinnerProps['state']>): string {
  const labels: Record<string, string> = {
    working: 'Cargando…',
    searching: 'Buscando…',
    solving: 'Procesando…',
    listening: 'Escuchando…',
    composing: 'Preparando…',
    shaping: 'Procesando…',
  };
  return labels[state] ?? 'Cargando…';
}
