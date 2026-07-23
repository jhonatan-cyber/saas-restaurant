import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KdsOrderCard } from '../kds-order-card';
import type { KdsOrderDTO } from '@saas/shared';

const mockOrder: KdsOrderDTO = {
  id: 'ord-001',
  version: 1,
  tableId: 't1',
  tableNumber: '5',
  status: 'SENT_TO_KITCHEN',
  type: 'DINE_IN',
  globalNotes: 'Cliente alérgico al maní',
  total: '45.50',
  itemCount: 2,
  createdAt: new Date().toISOString(),
  elapsedSeconds: 180,
  items: [
    { id: 'item-1', productName: 'Hamburguesa', quantity: 2, notes: 'sin cebolla', preparationAreaId: null, preparationAreaName: null },
    { id: 'item-2', productName: 'Papas Fritas', quantity: 1, notes: null, preparationAreaId: null, preparationAreaName: null },
  ],
};

describe('KdsOrderCard', () => {
  const baseProps = {
    order: mockOrder,
    onTransition: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders order number and table', () => {
    render(<KdsOrderCard {...baseProps} />);
    expect(screen.getByText(/Mesa 5/)).toBeInTheDocument();
  });

  it('renders elapsed time in green for < 5 min', () => {
    render(<KdsOrderCard {...baseProps} order={{ ...mockOrder, elapsedSeconds: 120 }} />);
    const timeEl = screen.getByText('02:00');
    expect(timeEl.className).toContain('green');
  });

  it('renders elapsed time in red for > 15 min', () => {
    render(<KdsOrderCard {...baseProps} order={{ ...mockOrder, elapsedSeconds: 1200 }} />);
    const timeEl = screen.getByText('20:00');
    expect(timeEl.className).toContain('red');
  });

  it('shows En preparación button for SENT_TO_KITCHEN status', () => {
    render(<KdsOrderCard {...baseProps} />);
    expect(screen.getByText('En preparación')).toBeInTheDocument();
  });

  it('shows Listo button for IN_PREPARATION status', () => {
    render(<KdsOrderCard {...baseProps} order={{ ...mockOrder, status: 'IN_PREPARATION' }} />);
    expect(screen.getByText('Listo')).toBeInTheDocument();
  });

  it('shows Entregado button for READY status', () => {
    render(<KdsOrderCard {...baseProps} order={{ ...mockOrder, status: 'READY' }} />);
    expect(screen.getByText('Entregado')).toBeInTheDocument();
  });

  it('calls onTransition with correct status', () => {
    const onTransition = vi.fn();
    render(<KdsOrderCard {...baseProps} onTransition={onTransition} />);
    fireEvent.click(screen.getByText('En preparación'));
    expect(onTransition).toHaveBeenCalledWith('IN_PREPARATION');
  });

  it('shows cancel button for active orders', () => {
    render(<KdsOrderCard {...baseProps} />);
    expect(screen.getByText('Cancelar orden')).toBeInTheDocument();
  });

  it('shows cancel prompt with reason input when clicking cancel', () => {
    render(<KdsOrderCard {...baseProps} />);
    fireEvent.click(screen.getByText('Cancelar orden'));
    expect(screen.getByPlaceholderText(/ej\. cliente se fue/)).toBeInTheDocument();
  });

  it('calls onCancel with reason when confirmed', () => {
    const onCancel = vi.fn();
    render(<KdsOrderCard {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancelar orden'));
    const input = screen.getByPlaceholderText(/ej\. cliente se fue/);
    fireEvent.change(input, { target: { value: 'Cliente canceló' } });
    fireEvent.click(screen.getByText('Confirmar'));
    expect(onCancel).toHaveBeenCalledWith('Cliente canceló');
  });

  it('renders item quantities and names', () => {
    render(<KdsOrderCard {...baseProps} />);
    expect(screen.getByText('2×')).toBeInTheDocument();
    expect(screen.getByText('Hamburguesa')).toBeInTheDocument();
    expect(screen.getByText('Papas Fritas')).toBeInTheDocument();
  });

  it('renders item notes', () => {
    render(<KdsOrderCard {...baseProps} />);
    expect(screen.getByText(/! sin cebolla/)).toBeInTheDocument();
  });

  it('renders global notes', () => {
    render(<KdsOrderCard {...baseProps} />);
    expect(screen.getByText('Cliente alérgico al maní')).toBeInTheDocument();
  });
});
