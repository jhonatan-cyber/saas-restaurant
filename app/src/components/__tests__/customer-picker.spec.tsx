import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerPicker } from '../customer-picker';

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('../../lib/api', () => ({
  customersApi: {
    search: vi.fn(),
    create: vi.fn(),
  },
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

describe('CustomerPicker', () => {
  const baseProps = {
    selectedCustomerId: null,
    selectedCustomerName: null,
    onSelect: vi.fn(),
  };

  it('renders add customer button when no customer selected', () => {
    render(<CustomerPicker {...baseProps} />);
    expect(screen.getByText('Cliente (opcional)')).toBeInTheDocument();
  });

  it('shows selected customer name when set', () => {
    render(<CustomerPicker {...baseProps} selectedCustomerId="c1" selectedCustomerName="Juan Pérez" />);
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('shows Cambiar and Quitar buttons when customer selected', () => {
    render(<CustomerPicker {...baseProps} selectedCustomerId="c1" selectedCustomerName="Juan Pérez" />);
    expect(screen.getByText('Cambiar')).toBeInTheDocument();
    expect(screen.getByText('Quitar')).toBeInTheDocument();
  });

  it('opens dropdown when clicking add button', () => {
    render(<CustomerPicker {...baseProps} />);
    fireEvent.click(screen.getByText('Cliente (opcional)'));
    expect(screen.getByPlaceholderText(/Buscar por nombre/)).toBeInTheDocument();
  });

  it('shows create button in dropdown footer', () => {
    render(<CustomerPicker {...baseProps} />);
    fireEvent.click(screen.getByText('Cliente (opcional)'));
    expect(screen.getByText('Crear nuevo cliente')).toBeInTheDocument();
  });

  it('calls onSelect with null when clicking Quitar', () => {
    const onSelect = vi.fn();
    render(<CustomerPicker {...baseProps} selectedCustomerId="c1" selectedCustomerName="Juan" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Quitar'));
    expect(onSelect).toHaveBeenCalledWith(null, null);
  });

  it('shows customer name in selected state', () => {
    render(<CustomerPicker {...baseProps} selectedCustomerId="c1" selectedCustomerName="Ana García" />);
    expect(screen.getByText('Ana García')).toBeInTheDocument();
  });
});
