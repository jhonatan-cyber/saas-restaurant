import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BranchSelect } from '../branch-select';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

describe('BranchSelect', () => {
  const baseProps = {
    value: '',
    onChange: vi.fn(),
  };

  it('shows loading while fetching', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: null, isLoading: true });
    const { container } = render(<BranchSelect {...baseProps} />);
    expect(container.querySelector('select')).toBeInTheDocument();
  });

  it('renders default option', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({ data: { data: [] }, isLoading: false });
    render(<BranchSelect {...baseProps} />);
    expect(screen.getByText('Todas las sucursales')).toBeInTheDocument();
  });

  it('renders branch options', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: { data: [{ id: 'b1', name: 'Sucursal Centro', code: 'CTR' }] },
      isLoading: false,
    });
    render(<BranchSelect {...baseProps} />);
    expect(screen.getByText('Sucursal Centro (CTR)')).toBeInTheDocument();
  });

  it('calls onChange when selecting a branch', async () => {
    const onChange = vi.fn();
    const { useQuery } = await import('@tanstack/react-query');
    (useQuery as any).mockReturnValue({
      data: { data: [{ id: 'b1', name: 'Sucursal Centro', code: 'CTR' }] },
      isLoading: false,
    });
    render(<BranchSelect value="" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'b1' } });
    expect(onChange).toHaveBeenCalledWith('b1');
  });
});
