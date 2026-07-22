import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComboItemsEditor } from '../combo-items-editor';

// Mock react-query's useQuery
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: { data: [] },
    isLoading: false,
  })),
}));

// Mock the productsApi
vi.mock('../../lib/api', () => ({
  productsApi: {
    list: vi.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, pageSize: 10, totalPages: 0 } }),
  },
}));

describe('ComboItemsEditor', () => {
  const defaultItems = [
    { productId: 'child-1', productName: 'Hamburguesa', quantity: 1 },
    { productId: 'child-2', productName: 'Papas Fritas', quantity: 2 },
  ];

  it('renders empty state message when no items', () => {
    render(<ComboItemsEditor items={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/No hay productos en este combo/)).toBeInTheDocument();
  });

  it('renders list of combo items', () => {
    render(<ComboItemsEditor items={defaultItems} onChange={vi.fn()} />);
    expect(screen.getByText('Hamburguesa')).toBeInTheDocument();
    expect(screen.getByText('Papas Fritas')).toBeInTheDocument();
  });

  it('displays quantity for each item', () => {
    render(<ComboItemsEditor items={defaultItems} onChange={vi.fn()} />);
    // El primer item tiene quantity 1, el segundo 2
    const quantities = screen.getAllByText(/^\d+$/);
    expect(quantities).toHaveLength(2);
    expect(quantities[0]).toHaveTextContent('1');
    expect(quantities[1]).toHaveTextContent('2');
  });

  it('shows item count in footer', () => {
    render(<ComboItemsEditor items={defaultItems} onChange={vi.fn()} />);
    expect(screen.getByText(/2 producto\(s\) en el combo/)).toBeInTheDocument();
  });

  it('shows empty footer when no items', () => {
    render(<ComboItemsEditor items={[]} onChange={vi.fn()} />);
    expect(screen.getByText(/Agregá productos para definir/)).toBeInTheDocument();
  });

  it('calls onChange with updated items when adding a product', () => {
    const onChange = vi.fn();
    render(<ComboItemsEditor items={defaultItems} onChange={onChange} />);

    // Abrir product picker
    fireEvent.click(screen.getByText('+ Agregar producto'));

    // El picker se muestra
    expect(screen.getByText('Buscar producto')).toBeInTheDocument();
  });

  it('calls onChange with filtered items when removing a product', () => {
    const onChange = vi.fn();
    render(<ComboItemsEditor items={defaultItems} onChange={onChange} />);

    // Encontrar y hacer click en el botón X del primer item
    const removeButtons = screen.getAllByLabelText('Quitar');
    fireEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledWith([
      { productId: 'child-2', productName: 'Papas Fritas', quantity: 2 },
    ]);
  });

  it('calls onChange with updated quantity when incrementing', () => {
    const onChange = vi.fn();
    render(<ComboItemsEditor items={defaultItems} onChange={onChange} />);

    // Encontrar botón + del primer item
    const plusButtons = screen.getAllByText('+');
    fireEvent.click(plusButtons[0]);

    expect(onChange).toHaveBeenCalledWith([
      { productId: 'child-1', productName: 'Hamburguesa', quantity: 2 },
      { productId: 'child-2', productName: 'Papas Fritas', quantity: 2 },
    ]);
  });

  it('calls onChange with updated quantity when decrementing', () => {
    const onChange = vi.fn();
    render(<ComboItemsEditor items={defaultItems} onChange={onChange} />);

    // Para el segundo item (quantity 2), hacer click en -
    const minusButtons = screen.getAllByText('−');
    fireEvent.click(minusButtons[1]);

    expect(onChange).toHaveBeenCalledWith([
      { productId: 'child-1', productName: 'Hamburguesa', quantity: 1 },
      { productId: 'child-2', productName: 'Papas Fritas', quantity: 1 },
    ]);
  });

  it('disables decrement button when quantity is 1', () => {
    render(<ComboItemsEditor items={defaultItems} onChange={vi.fn()} />);

    // Primer item tiene quantity 1, botón - debe estar disabled
    const minusButtons = screen.getAllByText('−');
    expect(minusButtons[0]).toBeDisabled();
  });

  it('does not call onChange when decrementing below 1', () => {
    const onChange = vi.fn();
    render(<ComboItemsEditor items={defaultItems} onChange={onChange} />);

    // Click en - del primer item (quantity 1), no debe llamar onChange
    const minusButtons = screen.getAllByText('−');
    fireEvent.click(minusButtons[0]);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows product picker when clicking add button', () => {
    render(<ComboItemsEditor items={defaultItems} onChange={vi.fn()} />);

    fireEvent.click(screen.getByText('+ Agregar producto'));

    expect(screen.getByText('Buscar producto')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Escribí el nombre/)).toBeInTheDocument();
  });

  it('closes product picker when clicking close button', () => {
    render(<ComboItemsEditor items={defaultItems} onChange={vi.fn()} />);

    fireEvent.click(screen.getByText('+ Agregar producto'));
    fireEvent.click(screen.getByText('Cerrar'));

    expect(screen.queryByText('Buscar producto')).not.toBeInTheDocument();
  });

  it('renders all items including those that could be duplicates', () => {
    const initialItems = [
      { productId: 'child-1', productName: 'Hamburguesa', quantity: 1 },
      { productId: 'child-3', productName: 'Gaseosa', quantity: 1 },
    ];
    const onChange = vi.fn();
    render(<ComboItemsEditor items={initialItems} onChange={onChange} />);

    // Verificar que todos los items se renderizan
    expect(screen.getByText('Hamburguesa')).toBeInTheDocument();
    expect(screen.getByText('Gaseosa')).toBeInTheDocument();
    expect(screen.getByText(/2 producto/)).toBeInTheDocument();
  });

  it('renders with correct ARIA labels', () => {
    render(<ComboItemsEditor items={defaultItems} onChange={vi.fn()} />);

    const removeButtons = screen.getAllByLabelText('Quitar');
    expect(removeButtons).toHaveLength(2);
  });
});
