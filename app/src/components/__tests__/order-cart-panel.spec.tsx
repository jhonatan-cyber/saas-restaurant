import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderCartPanel } from '../order-cart-panel';

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('../../lib/api', () => ({
  ordersApi: { create: vi.fn(), transition: vi.fn() },
}));

vi.mock('../../lib/orders-store', () => ({
  useOrdersCartStore: vi.fn((selector) => {
    const state = {
      items: [],
      tableId: null,
      tableNumber: null,
      customerId: null,
      customerName: null,
      type: 'DINE_IN',
      globalNotes: '',
      setTable: vi.fn(),
      setCustomer: vi.fn(),
      setType: vi.fn(),
      setGlobalNotes: vi.fn(),
      updateQty: vi.fn(),
      updateNotes: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    return selector(state);
  }),
  computeSubtotal: vi.fn(() => 0),
  computeTax: vi.fn(() => 0),
  computeTotal: vi.fn(() => 0),
  formatMoney: vi.fn((n: number) => n.toFixed(2)),
  cartItemCount: vi.fn(() => 0),
}));

vi.mock('../../lib/use-barcode-camera', () => ({
  useBarcodeCamera: () => ({
    state: { status: 'idle' },
    start: vi.fn(),
    stop: vi.fn(),
    reset: vi.fn(),
    videoRef: { current: null },
  }),
}));

describe('OrderCartPanel', () => {
  const baseProps = { branchId: 'branch-1' };

  it('renders empty cart message', () => {
    render(<OrderCartPanel {...baseProps} />);
    expect(screen.getByText(/El cart está vacío/)).toBeInTheDocument();
  });

  it('renders empty cart totals', () => {
    render(<OrderCartPanel {...baseProps} />);
    // 'Bs 0.00' appears for subtotal, tax, and total (3 instances)
    expect(screen.getAllByText('Bs 0.00')).toHaveLength(3);
  });

  it('show CustomerPicker', () => {
    render(<OrderCartPanel {...baseProps} />);
    expect(screen.getByText('Cliente (opcional)')).toBeInTheDocument();
  });

  it('shows type selector', () => {
    render(<OrderCartPanel {...baseProps} />);
    expect(screen.getByText('En mesa')).toBeInTheDocument();
  });

  it('shows global notes textarea', () => {
    render(<OrderCartPanel {...baseProps} />);
    expect(screen.getByPlaceholderText(/Ej\. cliente alérgico/)).toBeInTheDocument();
  });

  it('disables send button when cart is empty', () => {
    render(<OrderCartPanel {...baseProps} />);
    expect(screen.getByText('Crear y enviar a cocina')).toBeDisabled();
  });

  it('disables Cancelar button when cart is empty', () => {
    render(<OrderCartPanel {...baseProps} />);
    expect(screen.getByText('Cancelar')).toBeDisabled();
  });
});
