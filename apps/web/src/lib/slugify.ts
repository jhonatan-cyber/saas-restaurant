/**
 * Convierte un string en un slug URL-friendly.
 *  - lowercase
 *  - reemplaza acentos y caracteres no-ASCII
 *  - colapsa separadores a un solo guion
 *  - trim('-')
 *
 * Útil para autogenerar slugs a partir del `name` en los forms.
 */
export function slugify(input: string): string {
  return input
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
