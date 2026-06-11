/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, beforeEach, vi, type Mock } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartPage } from './CartPage';
import type { Cart } from '../types';

vi.mock('../api/ecommerceApi', () => ({
  useDeleteCartItemMutation: vi.fn(),
  useUpdateCartItemMutation: vi.fn(),
}));
import { useDeleteCartItemMutation, useUpdateCartItemMutation } from '../api/ecommerceApi';

const mockedUseUpdateCartItemMutation = useUpdateCartItemMutation as unknown as Mock;
const mockedUseDeleteCartItemMutation = useDeleteCartItemMutation as unknown as Mock;
let updateCartItem: Mock;
let deleteCartItem: Mock;

const baseCart: Cart = {
  items: [
    {
      id: 'item-1',
      productId: 'p1',
      quantity: 2,
      selectedColor: 'red',
      selectedSize: 'S',
      product: {
        id: 'p1',
        name: 'Test Product',
        category: 'test',
        description: 'A product description',
        price: 1999,
        originalPrice: 0,
        discountPercent: 0,
        rating: 4,
        reviewCount: 10,
        stockStatus: 'In Stock',
        colors: ['red'],
        sizes: ['S'],
        isNew: false,
        flags: [],
        image: 'default',
      },
      lineTotal: 3998,
    },
  ],
  subtotal: 3998,
  discount: 0,
  shipping: 500,
  total: 4498,
};

describe('CartPage', () => {
  beforeEach(() => {
    updateCartItem = vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) }));
    deleteCartItem = vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) }));
    mockedUseUpdateCartItemMutation.mockReturnValue([updateCartItem, {}]);
    mockedUseDeleteCartItemMutation.mockReturnValue([deleteCartItem, {}]);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows loading state while checking cart', () => {
    const { container } = render(
      <CartPage
        authStatus="checking"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={vi.fn()}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    // Check for skeleton elements instead of loading text
    // Target the Cart text in breadcrumbs (should be the last breadcrumb item)
    const breadcrumbsItems = screen.getAllByText(/Cart/i);
    // The Cart in breadcrumbs should not be a button/link (it's the current page)
    const cartInBreadcrumbs = breadcrumbsItems.find(
      (item) => !item.closest('button') && !item.closest('a')
    );
    expect(cartInBreadcrumbs).toBeInTheDocument();
    // Check that cart rows are rendered as skeletons
    expect(container.querySelectorAll('.cart-row').length).toBeGreaterThan(0);
    // Check that interactive elements are disabled
    expect(screen.getByPlaceholderText(/Coupon Code/i)).toBeDisabled();
  });

  it('shows loading state while cart is loading', () => {
    const { container } = render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={true}
        cartError=""
        navigate={vi.fn()}
        refreshCart={vi.fn()}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    // Check for skeleton elements instead of loading text
    // Target the Cart text in breadcrumbs (should be the last breadcrumb item)
    const breadcrumbsItems = screen.getAllByText(/Cart/i);
    // The Cart in breadcrumbs should not be a button/link (it's the current page)
    const cartInBreadcrumbs = breadcrumbsItems.find(
      (item) => !item.closest('button') && !item.closest('a')
    );
    expect(cartInBreadcrumbs).toBeInTheDocument();
    // Check that cart rows are rendered as skeletons
    expect(container.querySelectorAll('.cart-row').length).toBeGreaterThan(0);
    // Check that interactive elements are disabled
    expect(screen.getByPlaceholderText(/Coupon Code/i)).toBeDisabled();
  });

  it('renders guest state with sign in prompt', async () => {
    const navigate = vi.fn();
    render(
      <CartPage
        authStatus="guest"
        cart={{ ...baseCart, items: [] }}
        cartLoading={false}
        cartError=""
        navigate={navigate}
        refreshCart={vi.fn()}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Sign in to view your cart/i)).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: /Sign In or Register/i }));
    expect(navigate).toHaveBeenCalledWith('/account');
  });

  it('renders error state when cartError is present', async () => {
    const refreshCart = vi.fn();
    render(
      <CartPage
        authStatus="authenticated"
        cart={{ ...baseCart, items: [] }}
        cartLoading={false}
        cartError="Server error"
        navigate={vi.fn()}
        refreshCart={refreshCart}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    expect(screen.getByText(/We could not load your cart/i)).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    expect(refreshCart).toHaveBeenCalled();
  });

  it('renders an empty cart state when the cart has no items', async () => {
    const navigate = vi.fn();
    render(
      <CartPage
        authStatus="authenticated"
        cart={{ ...baseCart, items: [] }}
        cartLoading={false}
        cartError=""
        navigate={navigate}
        refreshCart={vi.fn()}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Your cart is empty/i)).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: /Return To Shop/i }));
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('renders cart items and updates quantity via API', async () => {
    const refreshCart = vi.fn();

    render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={refreshCart}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    expect(screen.getByText('Test Product')).toBeDefined();
    expect(screen.getByText('Color: red')).toBeDefined();
    expect(screen.getByText('Size: S')).toBeDefined();
    expect(screen.getByText('$1999')).toBeDefined();
    expect(screen.getByRole('button', { name: /Apply Coupon/i })).toBeDefined();

    const row = screen.getByText('Test Product').closest('.cart-row') as HTMLElement | null;
    expect(within(row!).getByText('$3998')).toBeDefined();
    const plusButton = row?.querySelectorAll('.quantity button')[1];
    await userEvent.click(plusButton!);

    await waitFor(() => expect(updateCartItem).toHaveBeenCalledWith({ id: 'item-1', quantity: 3 }));
    expect(refreshCart).toHaveBeenCalledWith('');

    const couponInput = screen.getByPlaceholderText('Coupon Code');
    await userEvent.type(couponInput, ' save10 ');
    await userEvent.click(screen.getByRole('button', { name: /Apply Coupon/i }));

    await waitFor(() => expect(refreshCart).toHaveBeenCalledWith('SAVE10'));
  });

  it('shows an action error when quantity update fails', async () => {
    const refreshCart = vi.fn();
    updateCartItem.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue(new Error('Update failed')),
    });

    const row = render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={refreshCart}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    const plusButton = row.container.querySelectorAll('.quantity button')[1];
    await userEvent.click(plusButton!);

    await waitFor(() => expect(screen.getByText(/Update failed/i)).toBeDefined());
    expect(refreshCart).not.toHaveBeenCalled();
  });

  it('shows stock errors when quantity exceeds availability', async () => {
    const refreshCart = vi.fn();
    updateCartItem.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: { message: 'Only 2 Test Product items are available' },
      }),
    });

    const row = render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={refreshCart}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    const plusButton = row.container.querySelectorAll('.quantity button')[1];
    await userEvent.click(plusButton!);

    await waitFor(() =>
      expect(screen.getByText(/Only 2 Test Product items are available/i)).toBeDefined()
    );
    expect(
      (
        screen.getByRole('button', {
          name: /Increase Test Product quantity unavailable/i,
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);

    await userEvent.click(
      screen.getByRole('button', { name: /Increase Test Product quantity unavailable/i })
    );
    expect(updateCartItem).toHaveBeenCalledTimes(1);
    expect(refreshCart).not.toHaveBeenCalled();
  });

  it('removes cart items via API and refreshes the coupon-aware cart', async () => {
    const refreshCart = vi.fn();

    render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={refreshCart}
        appliedCoupon="SAVE10"
        onAppliedCouponChange={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Remove Test Product/i }));

    await waitFor(() => expect(deleteCartItem).toHaveBeenCalledWith('item-1'));
    expect(refreshCart).toHaveBeenCalledWith('SAVE10');
  });

  it('shows an action error when remove fails', async () => {
    const refreshCart = vi.fn();
    deleteCartItem.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue({ message: 'Remove failed' }),
    });

    render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={refreshCart}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Remove Test Product/i }));

    await waitFor(() => expect(screen.getByText(/Remove failed/i)).toBeDefined());
    expect(refreshCart).not.toHaveBeenCalled();
  });
});
