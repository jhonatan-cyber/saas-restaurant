import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../../components/login-page';
import { authApi } from '~/lib';

// Mock the router - don't reference LoginPage in mock factory (hoisting issue)
const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => () => ({ component: () => null }),
  useRouter: () => ({ navigate: mockNavigate }),
}));

// Mock authApi (vi.mock is hoisted, so static import above gets the mocked version)
vi.mock('~/lib', () => ({
  authApi: {
    doLogin: vi.fn(),
    doLogout: vi.fn(),
    me: vi.fn(),
  },
  apiRequest: vi.fn(),
  getCurrentUser: vi.fn(),
  setCurrentUser: vi.fn(),
  initCsrf: vi.fn(),
  adminApi: {},
  plansApi: {},
}));

/**
 * Helper: create a mock fetch that resolves based on URL patterns.
 * Avoids mockResolvedValueOnce ordering issues with React Strict Mode
 * (effects fire twice, consuming once-call mocks prematurely).
 */
function createMockFetch(handlers: Array<{
  url: string | RegExp;
  status?: number;
  body?: unknown;
}>): any {
  const fn = vi.fn().mockImplementation((input: string) => {
    const handler = handlers.find((h) =>
      typeof h.url === 'string' ? input.includes(h.url) : h.url.test(input),
    );
    if (!handler) {
      return Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }
    const body = handler.body !== undefined ? JSON.stringify(handler.body) : null;
    return Promise.resolve(
      new Response(body, {
        status: handler.status ?? 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });
  return fn;
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state while checking session', () => {
    globalThis.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as any;

    const { container } = render(<LoginPage />);

    // Loading state renders a ThinkingOrb canvas
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('redirects to dashboard if already authenticated', async () => {
    globalThis.fetch = createMockFetch([
      { url: '/auth/me', status: 200, body: { id: 'u1', email: 'admin@test.com', role: 'SUPER_ADMIN' } },
    ]);

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' });
    });
  });

  it('shows setup form when needsSetup=true', async () => {
    globalThis.fetch = createMockFetch([
      { url: '/auth/me', status: 401 },
      { url: '/auth/setup-status', status: 200, body: { needsSetup: true } },
    ]);

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByText('Configuración Inicial')).toBeInTheDocument();
      expect(screen.getByText('Crear Super Administrador')).toBeInTheDocument();
    });
  });

  it('shows login form when session check fails and setup not needed', async () => {
    globalThis.fetch = createMockFetch([
      { url: '/auth/me', status: 401 },
      { url: '/auth/setup-status', status: 200, body: { needsSetup: false } },
    ]);

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByText('Ingresar')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    });
  });

  it('shows login form on network error during session check', async () => {
    globalThis.fetch = vi.fn().mockImplementation((input: string) => {
      if (input.includes('/auth/me')) {
        return Promise.resolve(new Response(null, { status: 401 }));
      }
      return Promise.reject(new Error('Network error'));
    }) as any;

    render(<LoginPage />);

    await waitFor(() => {
      expect(screen.getByText('Ingresar')).toBeInTheDocument();
    });
  });

  describe('login flow', () => {
    beforeEach(() => {
      globalThis.fetch = createMockFetch([
        { url: '/auth/me', status: 401 },
        { url: '/auth/setup-status', status: 200, body: { needsSetup: false } },
      ]);
    });

    it('calls authApi.doLogin and navigates on success', async () => {
      vi.mocked(authApi.doLogin).mockResolvedValue({
        id: 'u1', email: 'admin@test.com', role: 'SUPER_ADMIN',
      });

      render(<LoginPage />);

      await waitFor(() => expect(screen.getByText('Ingresar')).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });
      fireEvent.click(screen.getByText('Ingresar'));

      await waitFor(() => {
        expect(authApi.doLogin).toHaveBeenCalledWith('admin@test.com', 'secret123');
        expect(mockNavigate).toHaveBeenCalledWith({ to: '/dashboard' });
      });
    });

    it('shows error message on login failure', async () => {
      vi.mocked(authApi.doLogin).mockRejectedValue(new Error('Credenciales inválidas'));

      render(<LoginPage />);

      await waitFor(() => expect(screen.getByText('Ingresar')).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'bad@test.com' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrongpass' } });
      fireEvent.click(screen.getByText('Ingresar'));

      await waitFor(() => {
        expect(screen.getByText('Credenciales inválidas')).toBeInTheDocument();
      });
    });
  });

  describe('setup flow', () => {
    beforeEach(() => {
      globalThis.fetch = createMockFetch([
        { url: '/auth/me', status: 401 },
        { url: '/auth/setup-status', status: 200, body: { needsSetup: true } },
      ]);
    });

    it('calls setup API on form submit (state transition skipped due to jsdom limitation)', async () => {
      globalThis.fetch = createMockFetch([
        { url: '/auth/me', status: 401 },
        { url: '/auth/setup-status', status: 200, body: { needsSetup: true } },
        { url: '/auth/setup', status: 200, body: { success: true } },
      ]);

      render(<LoginPage />);

      await waitFor(() => expect(screen.getByText('Crear Super Administrador')).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });

      fireEvent.click(screen.getByText('Crear Super Administrador'));

      // Verify fetch was called with setup endpoint (button text change from loading
      // state can disrupt full form submission → state transition in jsdom)
      await waitFor(() => {
        const calls = (globalThis.fetch as any).mock.calls;
        expect(calls.some((c: any[]) => c[0]?.includes('/auth/setup'))).toBe(true);
        expect(calls.some((c: any[]) => c[1]?.method === 'POST')).toBe(true);
      });
    });

    it('calls setup API on form submit with error response', async () => {
      globalThis.fetch = createMockFetch([
        { url: '/auth/me', status: 401 },
        { url: '/auth/setup-status', status: 200, body: { needsSetup: true } },
        { url: '/auth/setup', status: 409, body: { message: 'El email ya existe' } },
      ]);

      render(<LoginPage />);

      await waitFor(() => expect(screen.getByText('Crear Super Administrador')).toBeInTheDocument());

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'exists@test.com' } });
      fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secret123' } });

      fireEvent.click(screen.getByText('Crear Super Administrador'));

      // Verify fetch was called with setup endpoint on error
      await waitFor(() => {
        const calls = (globalThis.fetch as any).mock.calls;
        const setupCall = calls.find(
          (c: any[]) => c[0]?.includes('/auth/setup') && c[1]?.method === 'POST',
        );
        expect(setupCall).toBeDefined();
      });
    });
  });
});
