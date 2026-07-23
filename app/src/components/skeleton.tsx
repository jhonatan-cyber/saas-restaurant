/**
 * Skeleton components para el app POS.
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
 * ## Capturar bones
 *
 * 1. Iniciá el dev server: `bun run dev`
 * 2. Ejecutá: `npx boneyard-js build`
 * 3. Boneyard abre un headless browser, renderiza los componentes
 *    y snapshottea el DOM para generar los `.bones.json`
 */
export { Skeleton } from 'boneyard-js/react';
