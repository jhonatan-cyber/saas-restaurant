/**
 * Helpers centralizados para manejo de errores en mutations de TanStack Query.
 *
 * Elimina la duplicación del patrón `onError: (err: unknown) => { ... }`
 * que se repite en ~30+ rutas del panel admin.
 *
 * USO:
 * ```ts
 * import { handleMutationError, extractErrorMessage } from '~/lib/error-handler';
 *
 * // Básico
 * useMutation({
 *   mutationFn: ...,
 *   onError: handleMutationError(setError),
 * });
 *
 * // Con fallback personalizado
 * useMutation({
 *   mutationFn: ...,
 *   onError: handleMutationError(setActionError, { fallback: 'Error al eliminar' }),
 * });
 *
 * // Con errores conocidos por código
 * useMutation({
 *   mutationFn: ...,
 *   onError: handleMutationError(setActionError, {
 *     knownErrors: {
 *       staleVersion: 'Otro usuario modificó esta orden. Refrescá la pantalla.',
 *       transitionNotAllowed: 'Esa transición ya no es válida.',
 *     },
 *   }),
 * });
 *
 * // Sólo extraer mensaje sin handler
 * const msg = extractErrorMessage(err, 'Fallback');
 * ```
 */
import { ApiClientError } from '~/lib/api';

/**
 * Extrae un mensaje legible de cualquier error.
 *
 * - `ApiClientError` (de `~/lib/api`) → usa `.message` (ya formateado)
 * - `Error` → usa `.message`
 * - Otro → fallback
 */
export function extractErrorMessage(err: unknown, fallback = 'Error desconocido'): string {
  if (err instanceof ApiClientError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

/**
 * Obtiene el error code de un error si existe.
 *
 * El backend NestJS suele devolver un campo `code` en el body de errores
 * como `staleVersion`, `transitionNotAllowed`, `CASH_SESSION_REQUIRED`, etc.
 *
 * Soporta dos fuentes:
 * 1. `ApiClientError` de `~/lib/api` — el code está dentro de `err.body`
 * 2. `ApiClientError` de `axios-client.ts` — el code es una propiedad directa
 * 3. Cualquier objeto con propiedad `code`
 */
export function extractErrorCode(err: unknown): string | undefined {
  // ApiClientError de ~/lib/api: code dentro de body
  if (err instanceof ApiClientError) {
    const bodyCode = (err.body as { code?: string })?.code;
    if (bodyCode) return bodyCode;
  }

  // ApiClientError de axios-client.ts u otro objeto con code directo
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string' && code.length > 0) return code;
  }

  return undefined;
}

/**
 * Crea un handler `onError` listo para usar en mutations de TanStack Query.
 *
 * Centraliza la lógica repetitiva de:
 * 1. Extraer mensaje de `ApiClientError` o `Error`
 * 2. Manejar errores conocidos por código (ej. staleVersion)
 * 3. Fallback a un mensaje por defecto
 *
 * @param setError - Función setState para mostrar el error (ej. `setError`, `setActionError`, `setServerError`)
 * @param options.fallback - Mensaje por defecto si no se puede extraer un mensaje (default: 'Error desconocido')
 * @param options.knownErrors - Mapa de `{ errorCode: mensaje }` para errores específicos del dominio
 */
export function handleMutationError(
  setError: (msg: string) => void,
  options?: {
    fallback?: string;
    knownErrors?: Record<string, string>;
  },
): (err: unknown) => void {
  const { fallback = 'Error desconocido', knownErrors = {} } = options ?? {};

  return (err: unknown) => {
    const code = extractErrorCode(err);
    if (code && knownErrors[code]) {
      setError(knownErrors[code]);
      return;
    }
    setError(extractErrorMessage(err, fallback));
  };
}
