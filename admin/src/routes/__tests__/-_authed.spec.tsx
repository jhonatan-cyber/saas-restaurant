import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthedLayout } from '../../components/authed-layout';
import { authApi, getCurrentUser, setCurrentUser } from '~/lib';
import type { ReactNode } from 'react';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({
    beforeLoad: vi.fn(),
    component: 'AuthedLayout',
  }),
  Outlet: () => <div data-testid="outlet" />,
  Link: ({ children, to }: { children: ReactNode; to?: string }) =>
    <a href={to}>{children}</a>,
  redirect: vi.fn(() => { throw new Error('redirect'); }),
  useRouter: () => ({ navigate: mockNavigate }),
}));

vi.mock('~/lib', () => ({
  authApi: {
    doLogout: vi.fn(),
  },
  getCurrentUser: vi.fn(),
  setCurrentUser: vi.fn(),
  apiRequest: vi.fn(),
  initCsrf: vi.fn(),
  adminApi: {},
  plansApi: {},
}));

const mockNavigate = vi.fn();
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('AuthedLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockNavigate.mockReset();
  });

  it('shows loading spinner while checking session', () => {
    vi.mocked(getCurrentUser).mockReturnValue(null);
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    const { container } = render(<AuthedLayout />);

    // Loading state renders a ThinkingOrb canvas
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders sidebar and children when already authenticated', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'u1', email: 'admin@test.com', role: 'SUPER_ADMIN',
    });

    render(<AuthedLayout />);

    expect(screen.getByText('MenuGest Admin')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Negocios')).toBeInTheDocument();
    expect(screen.getByText('Planes')).toBeInTheDocument();
    expect(screen.getByText('Admins')).toBeInTheDocument();
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
  });

  it('verifies session via /admin/auth/me if no user in memory', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(null);

    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 'u1', email: 'admin@test.com', role: 'SUPER_ADMIN' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    render(<AuthedLayout />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/auth/me',
        expect.objectContaining({ credentials: 'include' }),
      );
      expect(setCurrentUser).toHaveBeenCalledWith({
        id: 'u1', email: 'admin@test.com', role: 'SUPER_ADMIN',
      });
      expect(screen.getByText('MenuGest Admin')).toBeInTheDocument();
    });
  });

  it('redirects to login when session verification fails', async () => {
    vi.mocked(getCurrentUser).mockReturnValue(null);
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 401 }));

    render(<AuthedLayout />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login', replace: true });
    });
  });

  it('calls authApi.doLogout and navigates to login', async () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'u1', email: 'admin@test.com', role: 'SUPER_ADMIN',
    });
    vi.mocked(authApi.doLogout).mockResolvedValueOnce(undefined);

    render(<AuthedLayout />);

    fireEvent.click(screen.getByText('Cerrar sesión'));

    await waitFor(() => {
      expect(authApi.doLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
    });
  });
});
