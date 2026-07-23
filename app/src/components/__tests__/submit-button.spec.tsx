import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubmitButton } from '../submit-button';

describe('SubmitButton', () => {
  it('renders children text', () => {
    render(<SubmitButton isSubmitting={false}>Guardar</SubmitButton>);
    expect(screen.getByText('Guardar')).toBeInTheDocument();
  });

  it('shows loading text when submitting', () => {
    render(<SubmitButton isSubmitting={true}>Guardar</SubmitButton>);
    expect(screen.getByText('Guardando…')).toBeInTheDocument();
  });

  it('shows custom loading text', () => {
    render(<SubmitButton isSubmitting={true} loadingText="Enviando…">Guardar</SubmitButton>);
    expect(screen.getByText('Enviando…')).toBeInTheDocument();
  });

  it('is disabled when submitting', () => {
    render(<SubmitButton isSubmitting={true}>Guardar</SubmitButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<SubmitButton isSubmitting={false} disabled={true}>Guardar</SubmitButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<SubmitButton isSubmitting={false} onClick={onClick}>Guardar</SubmitButton>);
    fireEvent.click(screen.getByText('Guardar'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<SubmitButton isSubmitting={false} disabled={true} onClick={onClick}>Guardar</SubmitButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies fullWidth class', () => {
    render(<SubmitButton isSubmitting={false} fullWidth={true}>Guardar</SubmitButton>);
    expect(screen.getByRole('button').className).toContain('w-full');
  });

  it('has type submit by default', () => {
    render(<SubmitButton isSubmitting={false}>Guardar</SubmitButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('accepts type button', () => {
    render(<SubmitButton isSubmitting={false} type="button">Guardar</SubmitButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('applies danger variant class', () => {
    render(<SubmitButton isSubmitting={false} variant="danger">Eliminar</SubmitButton>);
    expect(screen.getByRole('button').className).toContain('btn-danger');
  });

  it('applies secondary variant class', () => {
    render(<SubmitButton isSubmitting={false} variant="secondary">Cancelar</SubmitButton>);
    expect(screen.getByRole('button').className).toContain('btn-secondary');
  });
});
