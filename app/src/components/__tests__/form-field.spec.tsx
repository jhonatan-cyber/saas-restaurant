import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '../form-field';

describe('FormField', () => {
  it('renders label text', () => {
    render(<FormField label="Nombre">input</FormField>);
    expect(screen.getByText('Nombre')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(<FormField label="Email"><input data-testid="test-input" /></FormField>);
    expect(screen.getByTestId('test-input')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<FormField label="Email" error="Campo requerido">input</FormField>);
    expect(screen.getByText('Campo requerido')).toBeInTheDocument();
  });

  it('hides hint when error is present', () => {
    render(<FormField label="Email" hint="Ingrese su email" error="Campo requerido">input</FormField>);
    expect(screen.queryByText('Ingrese su email')).not.toBeInTheDocument();
    expect(screen.getByText('Campo requerido')).toBeInTheDocument();
  });

  it('shows hint when no error', () => {
    render(<FormField label="Email" hint="Ingrese su email">input</FormField>);
    expect(screen.getByText('Ingrese su email')).toBeInTheDocument();
  });

  it('shows required asterisk', () => {
    render(<FormField label="Nombre" required={true}>input</FormField>);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('links label to input via htmlFor', () => {
    render(<FormField label="Email" htmlFor="email-input"><input id="email-input" /></FormField>);
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', 'email-input');
  });

  it('does not show asterisk by default', () => {
    render(<FormField label="Nombre">input</FormField>);
    expect(screen.queryByText('*')).not.toBeInTheDocument();
  });
});
