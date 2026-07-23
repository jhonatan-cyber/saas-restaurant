/**
 * Formateadores reutilizables para toda la aplicación.
 * Van acá para que tanto admin, app, como cualquier frontend
 * consuman los mismos transform sin duplicar lógica.
 */

/**
 * Capitaliza la primera letra de cada palabra.
 * Útil para nombres, apellidos, direcciones.
 *
 * @example capitalizeWords('carlos pérez') → 'Carlos Pérez'
 * @example capitalizeWords('calle 123, la paz') → 'Calle 123, La Paz'
 */
export function capitalizeWords(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Formatea un número de teléfono: solo dígitos, agrupa con guiones.
 * No asume un formato fijo — deja pasar lo que el usuario escribe
 * pero limpia caracteres no numéricos.
 *
 * @example formatPhone('712345678')  → '712-345-678'
 * @example formatPhone('1234')       → '123-4'
 * @example formatPhone('abc7def')    → '7'
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
