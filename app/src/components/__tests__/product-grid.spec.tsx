import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductGrid } from '../product-grid';
import { useQuery } from '@tanstack/react-query';
import type { Mock } from 'vitest';

const mockedUseQuery = useQuery as unknown as Mock;

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('../../lib/api', () => ({
  productsApi: { list: vi.fn() },
  categoriesApi: { all: vi.fn() },
}));

vi.mock('../../lib/auth-store', () => ({
  useAuthStore: vi.fn(() => ({ user: { id: 'u1', businessId: 'b1' } })),
}));

function setupMocks(categories: any[] = [], products: any[] = []) {
  mockedUseQuery.mockImplementation((options: any) => {
    const key = options.queryKey?.[0];
    if (key === 'categories') {
      const rawData = { data: categories };
      return { data: options.select ? options.select(rawData) : rawData, isLoading: false, error: null };
    }
    if (key === 'products') {
      return { data: { data: products }, isLoading: false, error: null };
    }
    return { data: null, isLoading: true, error: null };
  });
}

describe('ProductGrid', () => {
  const baseProps = { onAdd: vi.fn(), branchId: 'branch-1' };

  beforeEach(() => { vi.clearAllMocks(); });

  it('renders without crashing', () => {
    setupMocks([], []);
    const { container } = render(<ProductGrid {...baseProps} />);
    expect(container.querySelector('.card')).toBeInTheDocument();
  });

  it('shows category filter buttons', () => {
    setupMocks(
      [{ id: 'cat-1', name: 'Bebidas' }, { id: 'cat-2', name: 'Platos Fuertes' }],
      [],
    );
    render(<ProductGrid {...baseProps} />);
    expect(screen.getByText('Todas')).toBeInTheDocument();
    expect(screen.getByText('Bebidas')).toBeInTheDocument();
    expect(screen.getByText('Platos Fuertes')).toBeInTheDocument();
  });

  it('shows loading state for products', () => {
    mockedUseQuery.mockImplementation((options: any) => {
      const key = options.queryKey?.[0];
      if (key === 'categories') return { data: [], isLoading: false, error: null };
      if (key === 'products') return { data: null, isLoading: true, error: null };
      return { data: null, isLoading: false, error: null };
    });
    render(<ProductGrid {...baseProps} />);
    expect(screen.getByText('Cargando productos…')).toBeInTheDocument();
  });

  it('shows error state for products', () => {
    mockedUseQuery.mockImplementation((options: any) => {
      const key = options.queryKey?.[0];
      if (key === 'categories') return { data: [], isLoading: false, error: null };
      if (key === 'products') return { data: null, isLoading: false, error: new Error('fail') };
      return { data: null, isLoading: false, error: null };
    });
    render(<ProductGrid {...baseProps} />);
    expect(screen.getByText('Error al cargar productos')).toBeInTheDocument();
  });

  it('shows empty state when no products', () => {
    setupMocks([], []);
    render(<ProductGrid {...baseProps} />);
    expect(screen.getByText('No hay productos disponibles')).toBeInTheDocument();
  });

  it('renders product cards', () => {
    setupMocks([], [
      { id: 'p1', name: 'Hamburguesa', price: '45.00', isAvailable: true, productType: 'SALE', taxRate: '0.13', preparationAreaId: null, preparationArea: null, comboItems: null },
      { id: 'p2', name: 'Coca Cola', price: '12.00', isAvailable: true, productType: 'SALE', taxRate: null, preparationAreaId: null, preparationArea: null, comboItems: null },
    ]);
    render(<ProductGrid {...baseProps} />);
    expect(screen.getByText('Hamburguesa')).toBeInTheDocument();
    expect(screen.getByText('Coca Cola')).toBeInTheDocument();
  });

  it('shows COMBO badge for combo products', () => {
    setupMocks([], [
      { id: 'p1', name: 'Combo Familiar', price: '85.00', isAvailable: true, productType: 'COMBO', taxRate: null, preparationAreaId: null, preparationArea: null, comboItems: [] },
    ]);
    render(<ProductGrid {...baseProps} />);
    expect(screen.getByText('Combo')).toBeInTheDocument();
  });
});
