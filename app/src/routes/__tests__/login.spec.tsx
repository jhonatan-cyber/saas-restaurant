import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { validateSearch, getLoginErrorMessage, LoginPage } from '../login';

// ── Mocks (vitest hoists vi.mock to top, so everything inline) ──

vi.mock('../../lib/api', () => {
  class MockErr extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.name = 'ApiClientError';
      this.statusCode = statusCode;
    }
  }
  return {
    authApi: { login: vi.fn(), getCsrfToken: vi.fn() },
    ApiClientError: MockErr,
  };
});

vi.mock('../../lib/auth-store', () => ({
  useAuthStore: vi.fn((sel: any) => {
    const state = { setAuth: vi.fn() };
    return sel ? sel(state) : state;
  }),
  authStoreHelpers: { isAuthenticated: vi.fn(() => false) },
}));

vi.mock('../../lib/theme-store', () => ({
  useThemeStore: vi.fn(() => ({ theme: 'dark', toggle: vi.fn() })),
}));

vi.mock('../../lib/schemas', () => ({
  loginFormSchema: {},
  loginFormDefaults: { businessSlug: '', email: '', password: '' },
}));

vi.mock('@hookform/resolvers/zod', () => ({ zodResolver: vi.fn(() => vi.fn()) }));

vi.mock('sileo', () => ({ sileo: { error: vi.fn() } }));

vi.mock('@saas/ui', () => ({ OrbSpinner: () => null }));

vi.mock('border-beam', () => ({ BorderBeam: ({ children }: any) => children }));

vi.mock('react-hook-form', () => {
  const mockRegister = vi.fn(() => ({}));
  const mockHandleSubmit = vi.fn((fn: any) => async () => {
    await fn({ businessSlug: 'demo', email: 'a@b.com', password: '123456' });
  });
  return {
    useForm: vi.fn(() => ({
      register: mockRegister,
      handleSubmit: mockHandleSubmit,
      formState: { errors: {} },
    })),
  };
});

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  createFileRoute: () => (config: any) => ({
    ...config,
    useSearch: () => ({ slug: undefined, redirect: undefined }),
  }),
  redirect: vi.fn(),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('validateSearch', () => {
  it('extracts slug and redirect from search params', () => {
    const result = validateSearch({ slug: 'demo', redirect: '/orders' });
    expect(result.slug).toBe('demo');
    expect(result.redirect).toBe('/orders');
  });

  it('trims whitespace from slug', () => {
    const result = validateSearch({ slug: '  demo  ', redirect: '/dashboard' });
    expect(result.slug).toBe('demo');
  });

  it('returns undefined for non-string slug', () => {
    const result = validateSearch({ slug: 123, redirect: undefined });
    expect(result.slug).toBeUndefined();
    expect(result.redirect).toBeUndefined();
  });

  it('returns undefined for empty search', () => {
    const result = validateSearch({});
    expect(result.slug).toBeUndefined();
    expect(result.redirect).toBeUndefined();
  });
});

describe('getLoginErrorMessage', () => {
  it('returns 401 message for ApiClientError with statusCode 401', async () => {
    const mod: any = await import('../../lib/api');
    const ApiClientError = mod.ApiClientError as new (msg: string, code: number) => Error;
    const err = new ApiClientError('Unauthorized', 401);
    const { title, description } = getLoginErrorMessage(err);
    expect(title).toBe('Credenciales incorrectas');
    expect(description).toContain('email');
  });

  it('returns server error for 500+ status codes', async () => {
    const mod: any = await import('../../lib/api');
    const ApiClientError = mod.ApiClientError as new (msg: string, code: number) => Error;
    const err = new ApiClientError('Internal Error', 503);
    const { title } = getLoginErrorMessage(err);
    expect(title).toBe('Error del servidor');
  });

  it('returns generic message for ApiClientError with other codes', async () => {
    const mod: any = await import('../../lib/api');
    const ApiClientError = mod.ApiClientError as new (msg: string, code: number) => Error;
    const err = new ApiClientError('Custom error', 400);
    const { title, description } = getLoginErrorMessage(err);
    expect(title).toBe('No se pudo iniciar sesión');
    expect(description).toBe('Custom error');
  });

  it('handles HTTPError message', () => {
    const err = new Error('HTTPError');
    const { title, description } = getLoginErrorMessage(err);
    expect(title).toBe('Error del servidor');
  });

  it('returns generic message for unknown errors', () => {
    const result = getLoginErrorMessage('something unexpected');
    expect(result.description).toBe('Ocurrió un error inesperado.');
  });
});

describe('LoginPage component', () => {
  it('renders the welcome heading', () => {
    render(<LoginPage />);
    expect(screen.getByText('Bienvenido')).toBeInTheDocument();
  });

  it('renders the login form with all fields', () => {
    render(<LoginPage />);
    expect(screen.getByText('Negocio (slug)')).toBeInTheDocument();
    expect(screen.getByText('Correo electrónico')).toBeInTheDocument();
    expect(screen.getByText('Contraseña')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<LoginPage />);
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
  });

  it('renders forgot password link', () => {
    render(<LoginPage />);
    expect(screen.getByText('¿Olvidaste tu contraseña?')).toBeInTheDocument();
  });

  it('renders without error when searchParams has slug', () => {
    render(<LoginPage searchParams={{ slug: 'demo', redirect: undefined }} />);
    expect(screen.getByText('Bienvenido')).toBeInTheDocument();
  });

  it('renders without error when searchParams has redirect', () => {
    render(<LoginPage searchParams={{ slug: undefined, redirect: '/orders' }} />);
    expect(screen.getByText('Bienvenido')).toBeInTheDocument();
  });
});
