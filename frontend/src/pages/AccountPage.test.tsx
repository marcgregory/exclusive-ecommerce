/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountPage } from './AccountPage';
import type { Order, PublicUser } from '../types';

// Mock IntersectionObserver for jsdom (used by useScrollSpy)
class MockIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: readonly number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}
globalThis.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

const apiMocks = vi.hoisted(() => ({
  getOrders: vi.fn(),
  googleAuth: vi.fn(),
  register: vi.fn(),
  login: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('../api/ecommerceApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/ecommerceApi')>();
  return {
    ...actual,
    useGetOrdersQuery: (arg: undefined, options?: { skip?: boolean }) => {
      if (options?.skip) {
        return {
          data: undefined,
          isLoading: false,
          error: undefined,
          refetch: vi.fn(),
        };
      }
      return apiMocks.getOrders();
    },
    useGoogleAuthMutation: () => apiMocks.googleAuth(),
    useRegisterMutation: () => apiMocks.register(),
    useLoginMutation: () => apiMocks.login(),
    useUpdateProfileMutation: () => apiMocks.updateProfile(),
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

const order: Order = {
  id: 'order-1',
  userId: 'user-1',
  items: [
    {
      id: 'item-1',
      productId: 'p1',
      quantity: 2,
      selectedColor: 'Black',
      selectedSize: 'M',
      name: 'Classic Tee',
      price: 2500,
    },
  ],
  billing: {
    firstName: 'Jane',
    lastName: 'Doe',
    streetAddress: '123 Maple Drive',
    townCity: 'Townsville',
    phone: '555-0123',
    email: 'jane@example.com',
  },
  paymentMethod: 'bank',
  subtotal: 5000,
  discount: 500,
  shipping: 0,
  total: 4500,
  status: 'shipped',
  createdAt: '2026-04-10T12:00:00.000Z',
};

function renderPage(overrides: Partial<Parameters<typeof AccountPage>[0]> = {}) {
  const props = {
    userState: { data: user, loading: false, error: '' },
    onAuthChanged: vi.fn(),
    onUserRefresh: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn(),
    ...overrides,
  };

  const view = render(<AccountPage {...props} />);

  const customRerender = (newOverrides: Partial<Parameters<typeof AccountPage>[0]> = {}) => {
    const newProps = {
      ...props,
      ...newOverrides,
    };
    view.rerender(<AccountPage {...newProps} />);
  };

  return { ...props, ...view, rerender: customRerender };
}

describe('AccountPage', () => {
  beforeEach(() => {
    apiMocks.getOrders.mockReset();
    apiMocks.googleAuth.mockReset();
    apiMocks.register.mockReset();
    apiMocks.login.mockReset();
    apiMocks.updateProfile.mockReset();
    apiMocks.googleAuth.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a guest account prompt without auth form fields', () => {
    apiMocks.getOrders.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    apiMocks.register.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.updateProfile.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);

    renderPage({ userState: { data: null, loading: false, error: '' } });

    expect(screen.getByText(/Sign in to view your account/i)).toBeDefined();
    expect(screen.queryByLabelText(/Email or Phone Number/i)).toBeNull();
    expect(screen.queryByLabelText(/Password/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Login/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeDefined();
  });

  it('renders the authenticated profile', async () => {
    apiMocks.getOrders.mockReturnValue({
      data: { orders: [] },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    apiMocks.register.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.updateProfile.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);

    renderPage();

    expect(screen.getByText(/Welcome!/i)).toBeDefined();
    expect(screen.getByDisplayValue('Jane')).toBeDefined();
    expect(screen.getByDisplayValue('Doe')).toBeDefined();
    expect(screen.getByDisplayValue('jane@example.com')).toBeDefined();
  });

  it('shows order history loading and error states', async () => {
    apiMocks.getOrders.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
      refetch: vi.fn(),
    });
    apiMocks.register.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.updateProfile.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);

    const { rerender } = renderPage();

    expect(screen.getByRole('button', { name: /Refreshing/i })).toBeDefined();

    apiMocks.getOrders.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { data: { message: 'Orders unavailable' } },
      refetch: vi.fn(),
    });
    rerender({
      userState: { data: user, loading: false, error: '' },
      onAuthChanged: vi.fn(),
      onUserRefresh: vi.fn().mockResolvedValue(undefined),
      navigate: vi.fn(),
    });

    expect(screen.getByText(/Orders unavailable/i)).toBeDefined();
  });

  it('renders past orders', async () => {
    apiMocks.getOrders.mockReturnValue({
      data: { orders: [order] },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    apiMocks.register.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.updateProfile.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);

    renderPage();

    expect(await screen.findByText('order-1')).toBeDefined();
    expect(screen.getByText(/Apr 10, 2026/i)).toBeDefined();
    expect(screen.getByText(/Shipped/i)).toBeDefined();
    expect(screen.getByText(/1 item/i)).toBeDefined();
    expect(screen.getByText('$4500')).toBeDefined();
  });

  it('navigates to order details', async () => {
    const navigate = vi.fn();
    apiMocks.getOrders.mockReturnValue({
      data: { orders: [order] },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    apiMocks.register.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.updateProfile.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);

    renderPage({ navigate });

    await userEvent.click(await screen.findByRole('button', { name: /View Details/i }));

    expect(navigate).toHaveBeenCalledWith('/orders/order-1');
  });

  it('submits profile updates without blank password fields', async () => {
    const updatedUser: PublicUser = {
      ...user,
      firstName: 'Janet',
      lastName: 'Stone',
      address: '456 Oak Street',
    };
    const onAuthChanged = vi.fn();
    const unwrapFn = vi.fn().mockResolvedValue({ user: updatedUser });
    const mockUpdateProfile = vi.fn().mockReturnValue({ unwrap: unwrapFn });

    apiMocks.getOrders.mockReturnValue({
      data: { orders: [] },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    apiMocks.register.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.updateProfile.mockReturnValue([
      mockUpdateProfile,
      { isLoading: false, error: undefined },
    ]);

    renderPage({ onAuthChanged });

    const firstNameInput = screen.getByDisplayValue('Jane');
    const lastNameInput = screen.getByDisplayValue('Doe');
    const addressInput = screen.getByDisplayValue('123 Maple Drive');

    await userEvent.clear(firstNameInput);
    await userEvent.type(firstNameInput, 'Janet');
    await userEvent.clear(lastNameInput);
    await userEvent.type(lastNameInput, 'Stone');
    await userEvent.clear(addressInput);
    await userEvent.type(addressInput, '456 Oak Street');

    await userEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Janet',
          lastName: 'Stone',
          email: 'jane@example.com',
          address: '456 Oak Street',
        })
      )
    );

    const callArg = mockUpdateProfile.mock.calls[0][0];
    expect(callArg).not.toHaveProperty('currentPassword');
    expect(callArg).not.toHaveProperty('newPassword');
    expect(callArg).not.toHaveProperty('confirmPassword');
    expect(onAuthChanged).toHaveBeenCalledWith(updatedUser);
    expect(await screen.findByText(/Profile saved/i)).toBeDefined();
  });

  it('handles profile update error', async () => {
    const unwrapFn = vi.fn().mockRejectedValue({
      data: { message: 'Current password is incorrect' },
      status: 400,
    });
    const mockUpdateProfile = vi.fn().mockReturnValue({ unwrap: unwrapFn });

    apiMocks.getOrders.mockReturnValue({
      data: { orders: [] },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    });
    apiMocks.register.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.updateProfile.mockReturnValue([
      mockUpdateProfile,
      { isLoading: false, error: undefined },
    ]);

    renderPage();

    await userEvent.type(screen.getByLabelText(/^Current Password$/i), 'wrongpass');
    const passwordInputs = screen.getAllByLabelText(/New Password/i);
    await userEvent.type(passwordInputs[0], 'newpass123');
    await userEvent.type(screen.getByLabelText(/Confirm New Password/i), 'newpass123');
    await userEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPassword: 'wrongpass',
          newPassword: 'newpass123',
          confirmPassword: 'newpass123',
        })
      )
    );
    expect(await screen.findByText(/Current password is incorrect/i)).toBeDefined();
  });
});
