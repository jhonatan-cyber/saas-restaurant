import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  /** Texto de ayuda debajo del input */
  hint?: string;
  /** Mensaje de error (string) que se muestra debajo */
  error?: string;
  /** Si true, agrega un asterisco rojo después del label */
  required?: boolean;
  children: ReactNode;
}

/**
 * Wrapper de campo de formulario: label + ayuda + slot para el input + error.
 * DRY: el patrón label/input/error se repite en TODOS los forms; centralizarlo
 * mantiene la UI consistente y evita errores de accesibilidad (htmlFor).
 */
export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
}: FormFieldProps): ReactNode {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
