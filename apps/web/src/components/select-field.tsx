import type { ReactNode } from 'react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps {
  label: string;
  htmlFor?: string;
  /** Si true, agrega asterisco al label */
  required?: boolean;
  /** Texto de ayuda debajo */
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

/**
 * <select> con label + error.
 * Encapsula el patrón para que las páginas no repitan el mismo JSX.
 */
export function SelectField({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: SelectFieldProps): ReactNode {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <select
        id={htmlFor}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        disabled={disabled}
      >
        {placeholder && (
          <option value="" disabled={value !== ''}>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
