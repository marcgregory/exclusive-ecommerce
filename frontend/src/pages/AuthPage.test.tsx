/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthPage } from './AuthPage';
import type { PublicUser } from '../types';

const apiMocks = vi.hoisted(() => ({
  googleAuth: vi.fn(),
  register: vi.fn(),
  login: vi.fn(),
}));

vi.mock('../api/ecommerceApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/ecommerceApi')>();
  return {
    ...actual,
    useGoogleAuthMutation: () => apiMocks.googleAuth(),
    useRegisterMutation: () => apiMocks.register(),
    useLoginMutation: () => apiMocks.login(),
  };
});

const user: PublicUser = {
  id: 'user-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  address: '123 Maple Drive',
  role: 'customer',
};

function renderPage(mode: 'login' | 'register', overrides = {}) {
  const props = {
    mode,
    onAuthChanged: vi.fn(),
    navigate: vi.fn(),
    ...overrides,
  };

  const view = render(
    <GoogleOAuthProvider clientId="test">
      <AuthPage {...props} />
    </GoogleOAuthProvider>
  );

  return { ...props, ...view };
}

describe('AuthPage', () => {
  beforeEach(() => {
    apiMocks.googleAuth.mockReset();
    apiMocks.register.mockReset();
    apiMocks.login.mockReset();
    apiMocks.googleAuth.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the signup form', () => {
    apiMocks.register.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);

    renderPage('register');

    expect(screen.getByRole('heading', { level: 1, name: /Create an account/i })).toBeDefined();
    expect(screen.getByLabelText(/Name/i)).toBeDefined();
    expect(screen.getByLabelText(/Email or Phone Number/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
  });

  it('renders the login form', () => {
    apiMocks.register.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);

    renderPage('login');

    expect(screen.getByRole('heading', { level: 1, name: /Log in to Exclusive/i })).toBeDefined();
    expect(screen.queryByLabelText(/Name/i)).toBeNull();
    expect(screen.getByLabelText(/Email or Phone Number/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
  });

  it('navigates between login and signup pages', async () => {
    apiMocks.register.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    const navigate = vi.fn();

    renderPage('login', { navigate });

    await userEvent.click(screen.getByRole('button', { name: /Sign up/i }));
    expect(navigate).toHaveBeenCalledWith('/signup');
  });

  it('handles login successfully', async () => {
    const onAuthChanged = vi.fn();
    const unwrapFn = vi.fn().mockResolvedValue({ user });
    const mockLogin = vi.fn().mockReturnValue({ unwrap: unwrapFn });

    apiMocks.register.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([mockLogin, { isLoading: false, error: undefined }]);

    renderPage('login', { onAuthChanged });

    await userEvent.type(screen.getByLabelText(/Email or Phone Number/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'jane@example.com',
          password: 'password123',
        })
      )
    );
    expect(onAuthChanged).toHaveBeenCalledWith(user);
    expect(await screen.findByText(/Signed in/i)).toBeDefined();
  });

  it('handles registration successfully', async () => {
    const onAuthChanged = vi.fn();
    const unwrapFn = vi.fn().mockResolvedValue({ user });
    const mockRegister = vi.fn().mockReturnValue({ unwrap: unwrapFn });

    apiMocks.register.mockReturnValue([mockRegister, { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);

    renderPage('register', { onAuthChanged });

    await userEvent.type(screen.getByLabelText(/Name/i), 'Jane');
    await userEvent.type(screen.getByLabelText(/Email or Phone Number/i), 'jane@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: '',
        email: 'jane@example.com',
        password: 'password123',
        confirmPassword: 'password123',
        address: '',
      })
    );
    expect(onAuthChanged).toHaveBeenCalledWith(user);
    expect(await screen.findByText(/Account created/i)).toBeDefined();
  });

  it('handles login error', async () => {
    const unwrapFn = vi.fn().mockRejectedValue({
      data: { message: 'Invalid credentials' },
      status: 401,
    });
    const mockLogin = vi.fn().mockReturnValue({ unwrap: unwrapFn });

    apiMocks.register.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([mockLogin, { isLoading: false, error: undefined }]);

    renderPage('login');

    await userEvent.type(screen.getByLabelText(/Email or Phone Number/i), 'wrong@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /Log In/i }));

    await waitFor(() =>
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'wrong@example.com',
          password: 'wrongpass',
        })
      )
    );
    expect(await screen.findByText(/Invalid credentials/i)).toBeDefined();
  });

  it('handles registration error', async () => {
    const unwrapFn = vi.fn().mockRejectedValue({
      data: { message: 'Email already exists' },
      status: 400,
    });
    const mockRegister = vi.fn().mockReturnValue({ unwrap: unwrapFn });

    apiMocks.register.mockReturnValue([mockRegister, { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);

    renderPage('register');

    await userEvent.type(screen.getByLabelText(/Email or Phone Number/i), 'existing@example.com');
    await userEvent.type(screen.getByLabelText(/Password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'existing@example.com',
          password: 'password123',
          confirmPassword: 'password123',
        })
      )
    );
    expect(await screen.findByText(/Email already exists/i)).toBeDefined();
  });
});
