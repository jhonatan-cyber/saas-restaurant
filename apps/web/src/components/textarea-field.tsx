import type { ReactNode } from 'react';

interface TextareaFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}

/**
 * <textarea> con label + contador opcional + error.
 */
export function TextareaField({
  label,
  htmlFor,
  required = false,
  hint,
  error,
  value,
  onChange,
  rows = 3,
  placeholder,
  disabled = false,
  maxLength,
}: TextareaFieldProps): ReactNode {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <textarea
        id={htmlFor}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="input"
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
      />
      <div className="mt-1 flex items-start justify-between gap-2">
        <div className="flex-1">
          {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        {maxLength && (
          <p className="text-xs text-slate-400">
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}
