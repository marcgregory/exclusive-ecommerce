/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartPage } from './CartPage';
import type { Cart } from '../types';

const apiMocks = vi.hoisted(() => ({
  validateCoupon: vi.fn(),
}));

vi.mock('../api/ecommerceApi', () => ({
  useValidateCouponMutation: () => [apiMocks.validateCoupon, { isLoading: false }],
}));

function resolveMutation(value: unknown) {
  return { unwrap: vi.fn().mockResolvedValue(value) };
}

function rejectMutation(error: unknown) {
  return { unwrap: vi.fn().mockRejectedValue(error) };
}

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
  afterEach(() => {
    cleanup();
    apiMocks.validateCoupon.mockReset();
  });

  it('shows loading state while checking cart', () => {
    const { container } = render(
      <CartPage
        authStatus="loading"
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
        authStatus="unauthenticated"
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
    expect(navigate).toHaveBeenCalledWith('/login');
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

  it('renders cart items and commits draft quantity changes through Update Cart', async () => {
    const refreshCart = vi.fn();
    const onUpdateQuantity = vi.fn();

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
        onUpdateQuantity={onUpdateQuantity}
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

    expect(within(row!).getByText('3')).toBeDefined();
    expect(within(row!).getByText('$3998')).toBeDefined();
    expect(onUpdateQuantity).not.toHaveBeenCalled();
    expect(refreshCart).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Update Cart/i }));

    expect(onUpdateQuantity).toHaveBeenCalledWith('item-1', 3);
    await waitFor(() => expect(refreshCart).toHaveBeenCalledWith(''));

    const couponInput = screen.getByPlaceholderText('Coupon Code');
    apiMocks.validateCoupon.mockReturnValueOnce(
      resolveMutation({
        valid: true,
        coupon: { code: 'SAVE10', type: 'percent', amount: 10, active: true },
      })
    );

    await userEvent.type(couponInput, ' save10 ');
    await userEvent.click(screen.getByRole('button', { name: /Apply Coupon/i }));

    await waitFor(() => expect(apiMocks.validateCoupon).toHaveBeenCalledWith('SAVE10'));
    await waitFor(() => expect(refreshCart).toHaveBeenCalledWith('SAVE10'));
  });

  it('applies a valid percent coupon to the cart totals', async () => {
    const refreshCart = vi.fn();
    const onAppliedCouponChange = vi.fn();
    apiMocks.validateCoupon.mockReturnValueOnce(
      resolveMutation({
        valid: true,
        coupon: { code: 'SAVE10', type: 'percent', amount: 10, active: true },
      })
    );

    render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={refreshCart}
        appliedCoupon=""
        onAppliedCouponChange={onAppliedCouponChange}
      />
    );

    await userEvent.type(screen.getByPlaceholderText('Coupon Code'), 'save10');
    await userEvent.click(screen.getByRole('button', { name: /Apply Coupon/i }));

    await waitFor(() => expect(apiMocks.validateCoupon).toHaveBeenCalledWith('SAVE10'));
    expect(onAppliedCouponChange).toHaveBeenCalledWith('SAVE10');
    expect(refreshCart).toHaveBeenCalledWith('SAVE10');
    expect(screen.getByText(/Coupon SAVE10 applied/i)).toBeDefined();
    expect(screen.getByText('-$400')).toBeDefined();
    expect(screen.getByText('$4098')).toBeDefined();
  });

  it('applies a valid fixed coupon to the cart totals', async () => {
    apiMocks.validateCoupon.mockReturnValueOnce(
      resolveMutation({
        valid: true,
        coupon: { code: 'SAVE500', type: 'fixed', amount: 500, active: true },
      })
    );

    render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={vi.fn()}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    await userEvent.type(screen.getByPlaceholderText('Coupon Code'), 'save500');
    await userEvent.click(screen.getByRole('button', { name: /Apply Coupon/i }));

    await waitFor(() => expect(apiMocks.validateCoupon).toHaveBeenCalledWith('SAVE500'));
    expect(screen.getByText('-$500')).toBeDefined();
    expect(screen.getAllByText('$3998').length).toBeGreaterThan(0);
  });

  it('shows invalid coupon feedback and leaves totals unchanged', async () => {
    apiMocks.validateCoupon.mockReturnValueOnce(
      rejectMutation({ data: { message: 'Coupon code is not valid' } })
    );

    render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={vi.fn()}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    await userEvent.type(screen.getByPlaceholderText('Coupon Code'), 'missing');
    await userEvent.click(screen.getByRole('button', { name: /Apply Coupon/i }));

    expect(await screen.findByText(/Coupon code is not valid/i)).toBeDefined();
    expect(screen.queryByText(/Discount:/i)).toBeNull();
    expect(screen.getByText('$4498')).toBeDefined();
  });

  it('clears an applied coupon when the coupon field is empty', async () => {
    const refreshCart = vi.fn();
    const onAppliedCouponChange = vi.fn();

    render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={refreshCart}
        appliedCoupon="SAVE10"
        onAppliedCouponChange={onAppliedCouponChange}
      />
    );

    const couponInput = screen.getByPlaceholderText('Coupon Code');
    await userEvent.clear(couponInput);
    await userEvent.click(screen.getByRole('button', { name: /Applied: SAVE10/i }));

    expect(apiMocks.validateCoupon).not.toHaveBeenCalled();
    expect(onAppliedCouponChange).toHaveBeenCalledWith('');
    await waitFor(() => expect(refreshCart).toHaveBeenCalledWith(''));
    expect(screen.getByText(/Coupon removed/i)).toBeDefined();
  });

  it('does not render the clear cart action from the previous cart UI', () => {
    render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={vi.fn()}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: /Clear Cart/i })).toBeNull();
  });

  it('does not update quantities when Update Cart has no draft changes', async () => {
    const refreshCart = vi.fn();
    const onUpdateQuantity = vi.fn();

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
        onUpdateQuantity={onUpdateQuantity}
      />
    );

    const updateCartButton = screen.getByRole('button', { name: /Update Cart/i });
    expect(updateCartButton).toBeDisabled();
    await userEvent.click(updateCartButton);

    expect(onUpdateQuantity).not.toHaveBeenCalled();
    expect(refreshCart).not.toHaveBeenCalled();
  });

  it('removes cart items through the page callback', async () => {
    const refreshCart = vi.fn();
    const onRemoveItem = vi.fn();

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
        onRemoveItem={onRemoveItem}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Remove Test Product/i }));

    expect(onRemoveItem).toHaveBeenCalledWith('item-1');
    expect(refreshCart).not.toHaveBeenCalled();
  });
});
