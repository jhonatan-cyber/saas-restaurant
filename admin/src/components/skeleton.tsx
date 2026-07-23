/**
 * Skeleton components para el admin.
 *
 * Usa Boneyard (boneyard-js/react) para generar skeletons automáticos
 * desde el DOM real de los componentes.
 *
 * ## Uso básico
 *
 * ```tsx
 * import { Skeleton } from '~/components';
 *
 * <Skeleton name="mi-tabla" loading={isLoading}>
 *   {data && <table>...</table>}
 * </Skeleton>
 * ```
 *
 * ## Capturar bones (después de modificar componentes)
 *
 * 1. Iniciá el dev server: `bun run dev`
 * 2. Ejecutá: `npx boneyard-js build`
 * 3. Boneyard abre un headless browser, renderiza los componentes
 *    y snapshottea el DOM para generar los `.bones.json`
 *
 * ## Props principales
 *
 * - `loading: boolean` — muestra skeleton cuando es true
 * - `name: string` — identifica el skeleton para la captura
 * - `children` — contenido real que se renderiza cuando loading=false
 * - `fallback: ReactNode` — contenido alternativo cuando loading=true pero no hay bones
 * - `color`, `darkColor` — colores de los huesos (default: #f0f0f0 / #222222)
 * - `animate` — 'pulse' | 'shimmer' | 'solid'
 * - `stagger` — animación escalonada (default: false, true = 80ms)
 * - `transition` — transición al ocultar skeleton (default: false, true = 300ms)
 * - `fixture` — contenido renderizado durante build (útil si los datos vienen de API)
 */
export { Skeleton } from 'boneyard-js/react';
