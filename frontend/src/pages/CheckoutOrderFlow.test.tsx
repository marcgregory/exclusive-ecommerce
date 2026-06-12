/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { AccountPage } from './AccountPage';
import { CheckoutPage } from './CheckoutPage';
import { OrderPage } from './OrderPage';
import { GoogleOAuthProvider } from '@react-oauth/google';
import type { Cart, Navigate, Order, PublicUser } from '../types';

const apiMocks = vi.hoisted(() => ({
  createOrder: vi.fn(),
  createPayment: vi.fn(),
  getOrderDetail: vi.fn(),
  getOrders: vi.fn(),
  register: vi.fn(),
  login: vi.fn(),
  updateProfile: vi.fn(),
  googleAuth: vi.fn(),
  validateCoupon: vi.fn(),
  getMe: vi.fn(),
}));

vi.mock('../api/client', () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
  api: vi.fn(),
}));
vi.mock('../api/ecommerceApi', () => ({
  useCreateOrderMutation: () => [apiMocks.createOrder],
  useCreatePaymentMutation: () => [apiMocks.createPayment],
  useGetOrderDetailQuery: (id: string, options?: { skip?: boolean }) => {
    if (options?.skip) {
      return {
        data: undefined,
        error: undefined,
        isLoading: false,
        refetch: vi.fn(),
      };
    }
    return apiMocks.getOrderDetail(id);
  },
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
  useGetMeQuery: (arg: undefined, options?: { skip?: boolean }) => {
    if (options?.skip) {
      return {
        data: undefined,
        isLoading: false,
        error: undefined,
        refetch: vi.fn(),
      };
    }
    return apiMocks.getMe(arg);
  },
  useRegisterMutation: () => apiMocks.register(),
  useLoginMutation: () => apiMocks.login(),
  useUpdateProfileMutation: () => apiMocks.updateProfile(),
  useGoogleAuthMutation: () => apiMocks.googleAuth(),
  useValidateCouponMutation: () => [apiMocks.validateCoupon],
}));
import { api } from '../api/client';

const mockedApi = vi.mocked(api);

type MockCreateOrderInput = {
  billing: Record<string, string>;
  paymentMethod: string;
};

type MockCreatePaymentInput = {
  orderId: string;
};

const user: PublicUser = {
  id: 'user-1',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  address: '123 Maple Drive',
  role: 'customer',
};

const checkoutCart: Cart = {
  id: 'cart-1',
  items: [
    {
      id: 'cart-item-1',
      productId: 'p1',
      quantity: 2,
      selectedColor: 'Black',
      selectedSize: 'M',
      product: {
        id: 'p1',
        name: 'Classic Tee',
        category: 'apparel',
        description: 'A daily cotton tee.',
        price: 2500,
        originalPrice: 0,
        discountPercent: 0,
        rating: 5,
        reviewCount: 12,
        stockStatus: 'In Stock',
        colors: ['Black'],
        sizes: ['M'],
        isNew: false,
        flags: [],
        image: 'default',
      },
      lineTotal: 5000,
    },
  ],
  subtotal: 5000,
  discount: 500,
  shipping: 0,
  total: 4500,
};

const emptyCart: Cart = {
  items: [],
  subtotal: 0,
  discount: 0,
  shipping: 0,
  total: 0,
};

function TestCheckoutOrderFlow() {
  const [route, setRoute] = useState('/checkout');
  const [cart, setCart] = useState(checkoutCart);
  const navigate: Navigate = (href) => setRoute(href);
  const refreshCart = vi.fn(async () => setCart(emptyCart));

  return (
    <>
      <div data-testid="route">{route}</div>
      {route === '/checkout' ? (
        <CheckoutPage
          authStatus="authenticated"
          cart={cart}
          cartLoading={false}
          cartError=""
          refreshCart={refreshCart}
          navigate={navigate}
          appliedCoupon="SAVE10"
          onCouponConsumed={vi.fn()}
        />
      ) : null}
      {route.startsWith('/orders/') ? (
        <OrderPage authStatus="authenticated" id={route.split('/').pop()} navigate={navigate} />
      ) : null}
      {route === '/account' ? (
        <GoogleOAuthProvider clientId="test">
          <AccountPage
            userState={{ data: user, loading: false, error: '' }}
            onAuthChanged={vi.fn()}
            onUserRefresh={vi.fn().mockResolvedValue(undefined)}
            navigate={navigate}
          />
        </GoogleOAuthProvider>
      ) : null}
    </>
  );
}

describe('checkout to order history flow', () => {
  beforeEach(() => {
    const orders: Order[] = [];

    apiMocks.createOrder.mockReset();
    apiMocks.createPayment.mockReset();
    apiMocks.getOrderDetail.mockReset();
    apiMocks.getOrders.mockReset();
    apiMocks.register.mockReset();
    apiMocks.login.mockReset();
    apiMocks.updateProfile.mockReset();
    mockedApi.mockReset();

    apiMocks.getOrderDetail.mockImplementation((id: string) => ({
      data: orders.find((order) => order.id === id)
        ? { order: orders.find((order) => order.id === id)! }
        : undefined,
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    }));

    apiMocks.getOrders.mockImplementation(() => ({
      data: { orders },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    }));

    // Set up auth mutation mocks
    apiMocks.register.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.login.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.updateProfile.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.googleAuth.mockReturnValue([vi.fn(), { isLoading: false, error: undefined }]);
    apiMocks.validateCoupon.mockImplementation(() => {
      return {
        unwrap: async () => ({
          coupon: { code: 'SAVE10', type: 'percent', amount: 10 }
        })
      };
    });
    apiMocks.getMe.mockImplementation(() => {
      return {
        data: {
          user: {
            ...user,
            checkoutBilling: undefined,
          }
        },
        isLoading: false,
        error: undefined,
        refetch: vi.fn(),
      };
    });

    apiMocks.createOrder.mockImplementation((payload: MockCreateOrderInput) => ({
      unwrap: async () => {
        const order: Order = {
          id: 'order-1',
          userId: user.id,
          items: checkoutCart.items.map((item) => ({
            id: `order-${item.id}`,
            productId: item.productId,
            quantity: item.quantity,
            selectedColor: item.selectedColor,
            selectedSize: item.selectedSize,
            name: item.product.name,
            price: item.product.price,
          })),
          billing: payload.billing,
          paymentMethod: payload.paymentMethod,
          subtotal: checkoutCart.subtotal,
          discount: checkoutCart.discount,
          shipping: checkoutCart.shipping,
          total: checkoutCart.total,
          status: 'pending',
          createdAt: '2026-04-10T12:00:00.000Z',
        };
        orders.push(order);
        return { order };
      },
    }));
    apiMocks.createPayment.mockImplementation((payload: MockCreatePaymentInput) => ({
      unwrap: async () => {
        const order = orders.find((current) => current.id === payload.orderId);
        if (!order) throw new Error('Order not found');
        order.status = 'shipped';
        return {
          payment: { id: 'payment-1', status: 'succeeded', provider: 'stripe' },
          order,
        };
      },
    }));
    mockedApi.mockImplementation(async (path, options = {}) => {
      if (path === '/api/orders' && options.method === 'POST') {
        const payload = JSON.parse(String(options.body));
        const order: Order = {
          id: 'order-1',
          userId: user.id,
          items: checkoutCart.items.map((item) => ({
            id: `order-${item.id}`,
            productId: item.productId,
            quantity: item.quantity,
            selectedColor: item.selectedColor,
            selectedSize: item.selectedSize,
            name: item.product.name,
            price: item.product.price,
          })),
          billing: payload.billing,
          paymentMethod: payload.paymentMethod,
          subtotal: checkoutCart.subtotal,
          discount: checkoutCart.discount,
          shipping: checkoutCart.shipping,
          total: checkoutCart.total,
          status: 'pending',
          createdAt: '2026-04-10T12:00:00.000Z',
        };
        orders.push(order);
        return { order };
      }

      if (path === '/api/payments' && options.method === 'POST') {
        const payload = JSON.parse(String(options.body));
        const order = orders.find((current) => current.id === payload.orderId);
        if (!order) throw new Error('Order not found');
        order.status = 'shipped';
        return {
          payment: { id: 'payment-1', status: 'succeeded' },
          order,
        };
      }

      if (path === '/api/orders') {
        return { orders };
      }

      const orderMatch = String(path).match(/^\/api\/orders\/(.+)$/);
      if (orderMatch) {
        const order = orders.find((current) => current.id === orderMatch[1]);
        if (!order) throw new Error('Order not found');
        return { order };
      }

      throw new Error(`Unhandled API request: ${path}`);
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('checks out cart items, opens the order details, and lists the order in account history', async () => {
    const actor = userEvent.setup();
    render(<TestCheckoutOrderFlow />);

    expect(screen.getByText(/Classic Tee/i)).toBeDefined();
    expect(screen.getByText('$5000')).toBeDefined();

    await actor.type(screen.getByLabelText(/first Name/i), 'Jane');
    await actor.type(screen.getByLabelText(/street Address/i), '123 Maple Drive');
    await actor.type(screen.getByLabelText(/town City/i), 'Townsville');
    await actor.type(screen.getByLabelText(/phone/i), '555-0123');
    await actor.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await actor.click(screen.getByRole('button', { name: /Place Order/i }));

    await waitFor(() => expect(screen.getByTestId('route').textContent).toBe('/orders/order-1'));
    expect(await screen.findByText(/Thanks for your purchase/i)).toBeDefined();
    expect(screen.getAllByText('order-1').length).toBeGreaterThan(0);
    expect(screen.getByText('Qty 2 | Black | Size M')).toBeDefined();
    expect(screen.getByText(/Payment received/i)).toBeDefined();

    await actor.click(screen.getByRole('button', { name: /View Order History/i }));

    await waitFor(() => expect(screen.getByTestId('route').textContent).toBe('/account'));
    expect(await screen.findByText('Order History')).toBeDefined();
    expect(screen.getByText('order-1')).toBeDefined();
    expect(screen.getByText(/Apr 10, 2026/i)).toBeDefined();
    expect(screen.getByText(/Shipped/i)).toBeDefined();
    expect(screen.getAllByText('$4500').length).toBeGreaterThan(0);
  });
});
