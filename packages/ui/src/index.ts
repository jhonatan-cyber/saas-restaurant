/**
 * @saas/ui
 *
 * Paquete compartido de tokens, estilos y componentes base para la UI del monorepo.
 * Se puede consumir tanto desde la app admin como desde Storybook.
 */

export { uiThemeTokens } from './theme';
export type { UiThemeTokens } from './theme';

export { Button } from './components/button';
export type { ButtonProps, UiButtonSize, UiButtonVariant } from './components/button';

export { Badge } from './components/badge';
export type { BadgeProps, UiBadgeVariant } from './components/badge';

export { Card } from './components/card';
export type { CardProps } from './components/card';

export { Input } from './components/input';
export type { InputProps } from './components/input';
