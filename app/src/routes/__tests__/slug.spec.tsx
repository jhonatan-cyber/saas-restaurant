import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BusinessNotFound } from '../$slug';

describe('BusinessNotFound component', () => {
  it('renders the not-found title', () => {
    render(<BusinessNotFound slug="test-restobar" />);
    expect(screen.getByText('Negocio no encontrado')).toBeInTheDocument();
  });

  it('renders the slug text', () => {
    render(<BusinessNotFound slug="test-restobar" />);
    expect(screen.getByText('test-restobar')).toBeInTheDocument();
  });

  it('shows the message to contact administration', () => {
    render(<BusinessNotFound slug="test" />);
    expect(
      screen.getByText(/Comunícate con administración para realizar tu registro/),
    ).toBeInTheDocument();
  });

  it('has a link to the landing page', () => {
    render(<BusinessNotFound slug="test" />);
    const link = screen.getByText('Ir a la página principal');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', 'http://localhost:4321');
  });

  it('renders copyright footer', () => {
    render(<BusinessNotFound slug="test" />);
    expect(screen.getByText(/MenuGest/)).toBeInTheDocument();
  });
});
