import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TableFloorPlan } from '../table-floor-plan';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
    refetchQueries: vi.fn(),
  })),
}));

const mockTables: any[] = [
  { id: 't1', number: '1', capacity: 4, status: 'FREE', location: 'INDOOR', displayOrder: 0, posX: null, posY: null, branchId: 'b1', businessId: 'biz-1', notes: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 't2', number: '2', capacity: 2, status: 'OCCUPIED', location: 'INDOOR', displayOrder: 1, posX: null, posY: null, branchId: 'b1', businessId: 'biz-1', notes: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 't3', number: '3', capacity: 6, status: 'FREE', location: 'OUTDOOR', displayOrder: 2, posX: null, posY: null, branchId: 'b1', businessId: 'biz-1', notes: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

describe('TableFloorPlan', () => {
  const baseProps = {
    branchId: 'branch-1',
    selectedTableId: null,
    selectedTableNumber: null,
    onSelect: vi.fn(),
  };

  it('shows loading state', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: null, isLoading: true, isError: false });
    render(<TableFloorPlan {...baseProps} />);
    expect(screen.getByText('Cargando mesas…')).toBeInTheDocument();
  });

  it('shows empty state when no tables', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: [], isLoading: false, isError: false });
    render(<TableFloorPlan {...baseProps} />);
    expect(screen.getByText('No hay mesas configuradas en esta sucursal')).toBeInTheDocument();
  });

  it('shows error state', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: null, isLoading: false, isError: true });
    render(<TableFloorPlan {...baseProps} />);
    expect(screen.getByText('Error al cargar mesas')).toBeInTheDocument();
  });

  it('renders location zones', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: mockTables, isLoading: false, isError: false });
    render(<TableFloorPlan {...baseProps} />);
    // TABLE_LOCATION_LABELS: INDOOR → 'Interior', OUTDOOR → 'Exterior'
    expect(screen.getByText('Interior')).toBeInTheDocument();
    expect(screen.getByText('Exterior')).toBeInTheDocument();
  });

  it('shows free count in summary', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: mockTables, isLoading: false, isError: false });
    render(<TableFloorPlan {...baseProps} />);
    expect(screen.getByText(/2 libres/)).toBeInTheDocument();
  });

  it('shows occupied count in summary', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: mockTables, isLoading: false, isError: false });
    render(<TableFloorPlan {...baseProps} />);
    expect(screen.getByText(/1 ocupada/)).toBeInTheDocument();
  });

  it('shows selected table indicator when a table is selected', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: mockTables, isLoading: false, isError: false });
    render(<TableFloorPlan {...baseProps} selectedTableId="t1" selectedTableNumber="1" />);
    expect(screen.getByText('Mesa 1')).toBeInTheDocument();
  });

  it('shows refresh button', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: mockTables, isLoading: false, isError: false });
    render(<TableFloorPlan {...baseProps} />);
    expect(screen.getByText('Refrescar')).toBeInTheDocument();
  });
});
