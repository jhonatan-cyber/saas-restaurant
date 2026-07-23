import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaymentModal } from '../payment-modal';

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
    error: null,
  })),
}));

const mockOrder = {
  id: 'ord-123',
  total: '150.00',
  branchId: 'branch-1',
  businessId: 'biz-1',
  status: 'DELIVERED',
  type: 'DINE_IN',
  channel: 'POS_WEB',
  tableId: 'table-1',
  subtotal: '125.00',
  taxTotal: '25.00',
  version: 1,
  items: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} as any;

describe('PaymentModal', () => {
  const baseProps = {
    open: true,
    order: mockOrder,
    branchId: 'branch-1',
    onClose: vi.fn(),
    onPaid: vi.fn(),
  };

  it('does not render when closed', () => {
    const { container } = render(<PaymentModal {...baseProps} open={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('does not render without order', () => {
    const { container } = render(<PaymentModal {...baseProps} order={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders order ID and total', () => {
    render(<PaymentModal {...baseProps} />);
    // 'Total a cobrar' appears twice (header + footer), 'Bs 150.00' appears
    // 3 times (header total, footer total, and footer faltante=150 since 0 assigned)
    expect(screen.getAllByText(/Total a cobrar/)).toHaveLength(2);
    expect(screen.getAllByText('Bs 150.00')).toHaveLength(3);
  });

  it('shows CASH as default payment method', () => {
    render(<PaymentModal {...baseProps} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('CASH');
  });

  it('disables confirm button when amounts do not match total', () => {
    render(<PaymentModal {...baseProps} />);
    expect(screen.getByText('Confirmar pago')).toBeDisabled();
  });

  it('shows add payment button', () => {
    render(<PaymentModal {...baseProps} />);
    expect(screen.getByText(/Agregar método de pago/)).toBeInTheDocument();
  });

  it('shows Faltante when no amount entered', () => {
    render(<PaymentModal {...baseProps} />);
    expect(screen.getByText('Faltante')).toBeInTheDocument();
  });

  it('allows removing payment when more than one exists', () => {
    render(<PaymentModal {...baseProps} />);
    const addBtn = screen.getByText(/Agregar método de pago/);
    fireEvent.click(addBtn);
    // After adding a second item, both show a remove button
    const removeBtns = screen.getAllByText('Quitar');
    expect(removeBtns).toHaveLength(2);
  });

  it('calls onClose when clicking cancel', () => {
    const onClose = vi.fn();
    render(<PaymentModal {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
