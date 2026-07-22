import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../status-badge';

describe('StatusBadge', () => {
  it('renders the label text', () => {
    render(<StatusBadge label="Activo" variant="success" />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('applies the success variant styles', () => {
    render(<StatusBadge label="Activo" variant="success" />);
    const badge = screen.getByText('Activo');
    expect(badge.className).toContain('bg-green-100');
    expect(badge.className).toContain('text-green-700');
  });

  it('applies the danger variant styles', () => {
    render(<StatusBadge label="Cancelado" variant="danger" />);
    const badge = screen.getByText('Cancelado');
    expect(badge.className).toContain('bg-red-100');
    expect(badge.className).toContain('text-red-700');
  });

  it('applies the warning variant styles', () => {
    render(<StatusBadge label="Pendiente" variant="warning" />);
    const badge = screen.getByText('Pendiente');
    expect(badge.className).toContain('bg-yellow-100');
    expect(badge.className).toContain('text-yellow-800');
  });

  it('renders as a span element', () => {
    render(<StatusBadge label="Test" variant="neutral" />);
    const badge = screen.getByText('Test');
    expect(badge.tagName).toBe('SPAN');
  });
});
