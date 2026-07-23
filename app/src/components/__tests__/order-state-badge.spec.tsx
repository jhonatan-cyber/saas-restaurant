import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderStateBadge } from '../order-state-badge';

describe('OrderStateBadge', () => {
  it('renders PENDING status label', () => {
    render(<OrderStateBadge status="PENDING" />);
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('renders PAID status label', () => {
    render(<OrderStateBadge status="PAID" />);
    expect(screen.getByText('Pagado')).toBeInTheDocument();
  });

  it('renders CANCELLED status label', () => {
    render(<OrderStateBadge status="CANCELLED" />);
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('renders SENT_TO_KITCHEN status label', () => {
    render(<OrderStateBadge status="SENT_TO_KITCHEN" />);
    expect(screen.getByText('Enviado a cocina')).toBeInTheDocument();
  });
});
