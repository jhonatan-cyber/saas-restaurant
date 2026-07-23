import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PosActiveOrders } from '../pos-active-orders';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const mockOrders: any[] = [
  {
    id: 'ord-1',
    status: 'DELIVERED',
    total: '85.00',
    type: 'DINE_IN',
    tableId: 't1',
    tableNumber: '3',
    itemCount: 4,
    branchId: 'b1',
    businessId: 'biz-1',
    cashierId: 'u1',
    createdAt: new Date(Date.now() - 300000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ord-2',
    status: 'PENDING',
    total: '42.00',
    type: 'TAKEOUT',
    tableId: null,
    tableNumber: null,
    itemCount: 2,
    branchId: 'b1',
    businessId: 'biz-1',
    cashierId: 'u1',
    createdAt: new Date(Date.now() - 600000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('PosActiveOrders', () => {
  const baseProps = {
    branchId: 'branch-1',
    onPayOrder: vi.fn(),
  };

  it('calls onPayOrder when clicking Cobrar', async () => {
    const onPayOrder = vi.fn();
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: { data: mockOrders },
      isLoading: false,
      isError: false,
    });
    render(<PosActiveOrders {...baseProps} onPayOrder={onPayOrder} />);
    // DELIVERED section is expanded by default. Find the individual order Cobrar button.
    const btns = screen.getAllByText('Cobrar');
    expect(btns.length).toBeGreaterThan(0);
    fireEvent.click(btns[0]!);
    expect(onPayOrder).toHaveBeenCalledWith(expect.objectContaining({ id: 'ord-1' }));
  });

  it('shows loading state', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
    });
    render(<PosActiveOrders {...baseProps} />);
    expect(screen.getByText(/Cargando órdenes activas/)).toBeInTheDocument();
  });

  it('shows empty state when no orders', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
    });
    render(<PosActiveOrders {...baseProps} />);
    expect(screen.getByText('No hay órdenes activas')).toBeInTheDocument();
  });

  it('renders active orders count', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: { data: mockOrders },
      isLoading: false,
      isError: false,
    });
    render(<PosActiveOrders {...baseProps} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows Cobrar button for DELIVERED orders', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: { data: mockOrders },
      isLoading: false,
      isError: false,
    });
    render(<PosActiveOrders {...baseProps} />);
    // Header 'Cobrar (1)' + individual order 'Cobrar' (DELIVERED expanded by default)
    expect(screen.getAllByText(/Cobrar/).length).toBeGreaterThan(0);
  });

  it('renders order status labels', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: { data: mockOrders },
      isLoading: false,
      isError: false,
    });
    render(<PosActiveOrders {...baseProps} />);
    // 'Entregado' appears in group header + order item (2)
    expect(screen.getAllByText('Entregado')).toHaveLength(2);
    // 'Pendiente' in header button textContent = "Pendiente1" (label + count)
    expect(screen.getByText(/Pendiente/)).toBeInTheDocument();
  });

  it('renders table number for DINE_IN orders', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: { data: mockOrders },
      isLoading: false,
      isError: false,
    });
    render(<PosActiveOrders {...baseProps} />);
    expect(screen.getByText(/M3/)).toBeInTheDocument();
  });
});
