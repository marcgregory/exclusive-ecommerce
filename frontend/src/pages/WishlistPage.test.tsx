/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WishlistPage } from './WishlistPage';
import type { Product, ProductDetailResponse } from '../types';

vi.mock('../api/ecommerceApi', () => ({
  useAddCartItemMutation: vi.fn(),
  useDeleteWishlistProductMutation: vi.fn(),
  useGetWishlistQuery: vi.fn(),
  useLazyGetProductDetailQuery: vi.fn(),
}));
import {
  useAddCartItemMutation,
  useDeleteWishlistProductMutation,
  useGetWishlistQuery,
  useLazyGetProductDetailQuery,
} from '../api/ecommerceApi';

const mockedUseAddCartItemMutation = useAddCartItemMutation as unknown as Mock;
const mockedUseDeleteWishlistProductMutation = useDeleteWishlistProductMutation as unknown as Mock;
const mockedUseGetWishlistQuery = useGetWishlistQuery as unknown as Mock;
const mockedUseLazyGetProductDetailQuery = useLazyGetProductDetailQuery as unknown as Mock;
let addCartItem: Mock;
let deleteWishlistProduct: Mock;
let getProductDetail: Mock;
let refetchWishlist: Mock;

const product: Product = {
  id: 'p1',
  name: 'Wishlist Product',
  category: 'test',
  description: 'A product saved for later',
  price: 1999,
  originalPrice: 2499,
  discountPercent: 20,
  rating: 4,
  reviewCount: 10,
  stockStatus: 'In Stock',
  colors: ['red'],
  sizes: ['S'],
  isNew: false,
  flags: [],
  image: 'default',
};

const secondProduct: Product = {
  ...product,
  id: 'p2',
  name: 'Second Wishlist Product',
  image: 'gamepad-red',
};

const productWithoutOptions: Product = {
  ...product,
  colors: [],
  sizes: [],
};

function mockWishlist(products: Product[], overrides = {}) {
  refetchWishlist = vi.fn();
  mockedUseGetWishlistQuery.mockReturnValue({
    data: { products },
    error: undefined,
    isError: false,
    isFetching: false,
    isLoading: false,
    refetch: refetchWishlist,
    ...overrides,
  });
}

function mockProductDetail(data: ProductDetailResponse) {
  getProductDetail.mockReturnValueOnce({ unwrap: vi.fn().mockResolvedValue(data) });
}

function renderPage(overrides: Partial<Parameters<typeof WishlistPage>[0]> = {}) {
  const props = {
    authStatus: 'authenticated' as const,
    navigate: vi.fn(),
    onAdd: vi.fn().mockResolvedValue(undefined),
    refreshCart: vi.fn().mockResolvedValue(undefined),
    refreshWishlist: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  const view = render(<WishlistPage {...props} />);
  return { ...props, ...view };
}

describe('WishlistPage', () => {
  beforeEach(() => {
    addCartItem = vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) }));
    deleteWishlistProduct = vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) }));
    getProductDetail = vi.fn(() => ({
      unwrap: vi.fn().mockResolvedValue({ product, related: [], variants: [] }),
    }));
    mockWishlist([product]);
    mockedUseAddCartItemMutation.mockReturnValue([addCartItem, {}]);
    mockedUseDeleteWishlistProductMutation.mockReturnValue([deleteWishlistProduct, {}]);
    mockedUseLazyGetProductDetailQuery.mockReturnValue([getProductDetail, {}]);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows loading state while auth is checking', () => {
    renderPage({ authStatus: 'checking' });

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/Wishlist/i);
    expect(screen.getByTestId('product-grid-skeleton')).toBeDefined();
    expect(screen.getAllByTestId('product-card-skeleton')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /Add To Cart/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Wishlist/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /View/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Move to cart/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Remove/i })).toBeNull();
    expect(mockedUseGetWishlistQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });

  it('renders guest state with a sign in prompt', async () => {
    const navigate = vi.fn();
    renderPage({ authStatus: 'guest', navigate });

    expect(screen.getByText(/Sign in to view your wishlist/i)).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: /Sign In or Register/i }));

    expect(navigate).toHaveBeenCalledWith('/login');
    expect(mockedUseGetWishlistQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });

  it('shows loading state while wishlist products are loading', () => {
    mockWishlist([], { data: undefined, isLoading: true });
    renderPage();

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/Wishlist/i);
    expect(screen.getByTestId('product-grid-skeleton')).toBeDefined();
    expect(screen.getAllByTestId('product-card-skeleton')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /Add To Cart/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Wishlist/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /View/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Move to cart/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Remove/i })).toBeNull();
  });

  it('shows skeleton only while wishlist products are refetching', () => {
    mockWishlist([product], { isFetching: true });
    renderPage();

    expect(screen.getByTestId('product-grid-skeleton')).toBeDefined();
    expect(screen.getAllByTestId('product-card-skeleton')).toHaveLength(1);
    expect(screen.queryByText('Wishlist Product')).toBeNull();
    expect(screen.queryByRole('button', { name: /Move to cart/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Remove Wishlist Product/i })).toBeNull();
  });

  it('renders an error state and retries loading', async () => {
    mockWishlist([], {
      data: undefined,
      error: { status: 500, data: { message: 'Wishlist unavailable' } },
      isError: true,
    });

    renderPage();

    expect(await screen.findByText(/We could not load your wishlist/i)).toBeDefined();
    expect(screen.getByText(/Wishlist unavailable/i)).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: /Try Again/i }));

    expect(refetchWishlist).toHaveBeenCalled();
  });

  it('renders an empty wishlist state', async () => {
    const navigate = vi.fn();
    mockWishlist([]);
    renderPage({ navigate });

    expect(await screen.findByText(/Your wishlist is empty/i)).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: /Return To Shop/i }));

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('renders wishlist products', async () => {
    mockWishlist([product, secondProduct]);
    renderPage();

    expect(await screen.findByText('Wishlist Product')).toBeDefined();
    expect(screen.getByText('Second Wishlist Product')).toBeDefined();
    expect(screen.getByText('Wishlist (2)')).toBeDefined();
  });

  it('removes an item from the wishlist', async () => {
    const refreshWishlist = vi.fn().mockResolvedValue(undefined);
    mockWishlist([product]);
    renderPage({ refreshWishlist });

    await screen.findByText('Wishlist Product');
    await userEvent.click(screen.getByRole('button', { name: /Remove Wishlist Product/i }));

    await waitFor(() => expect(deleteWishlistProduct).toHaveBeenCalledWith('p1'));
    await waitFor(() => expect(refreshWishlist).toHaveBeenCalled());
    expect(screen.getByText(/Your wishlist is empty/i)).toBeDefined();
  });

  it('moves an item to the cart using the first in-stock detail variant, then removes it from the wishlist', async () => {
    const refreshCart = vi.fn().mockResolvedValue(undefined);
    const refreshWishlist = vi.fn().mockResolvedValue(undefined);
    const productWithOptions = { ...product, colors: ['red', 'blue'], sizes: ['S', 'M'] };
    mockWishlist([productWithOptions]);
    mockProductDetail({
      product: productWithOptions,
      related: [],
      variants: [
        { id: 'v-red-s', productId: 'p1', sku: 'RED-S', color: 'red', size: 'S', stock: 0 },
        { id: 'v-blue-m', productId: 'p1', sku: 'BLUE-M', color: 'blue', size: 'M', stock: 4 },
      ],
    });
    renderPage({ refreshCart, refreshWishlist });

    await screen.findByText('Wishlist Product');
    await userEvent.click(screen.getByRole('button', { name: /Move to cart/i }));

    await waitFor(() => {
      expect(getProductDetail).toHaveBeenCalledWith('p1');
      expect(addCartItem).toHaveBeenCalledWith({
        productId: 'p1',
        quantity: 1,
        selectedColor: 'blue',
        selectedSize: 'M',
      });
      expect(deleteWishlistProduct).toHaveBeenCalledWith('p1');
    });

    const cartAddCall = addCartItem.mock.invocationCallOrder[0];
    const wishlistDeleteCall = deleteWishlistProduct.mock.invocationCallOrder[0];
    expect(cartAddCall).toBeGreaterThan(-1);
    expect(wishlistDeleteCall).toBeGreaterThan(cartAddCall);
    expect(refreshCart).toHaveBeenCalled();
    expect(refreshWishlist).toHaveBeenCalled();
    expect(screen.getByText(/Your wishlist is empty/i)).toBeDefined();
  });

  it('moves an item without variants directly to the cart', async () => {
    mockWishlist([productWithoutOptions]);
    renderPage();

    await screen.findByText('Wishlist Product');
    await userEvent.click(screen.getByRole('button', { name: /Move to cart/i }));

    await waitFor(() => {
      expect(addCartItem).toHaveBeenCalledWith({
        productId: 'p1',
        quantity: 1,
        selectedColor: '',
        selectedSize: '',
      });
    });
    expect(getProductDetail).not.toHaveBeenCalled();
  });

  it('routes to product detail with feedback when no in-stock variant can be found', async () => {
    const navigate = vi.fn();
    mockWishlist([product]);
    mockProductDetail({
      product,
      related: [],
      variants: [
        { id: 'v-red-s', productId: 'p1', sku: 'RED-S', color: 'red', size: 'S', stock: 0 },
      ],
    });
    renderPage({ navigate });

    await screen.findByText('Wishlist Product');
    await userEvent.click(screen.getByRole('button', { name: /Move to cart/i }));

    expect(
      await screen.findByText(
        /Choose available options for Wishlist Product before moving it to cart/i
      )
    ).toBeDefined();
    expect(navigate).toHaveBeenCalledWith('/product/p1');
    expect(addCartItem).not.toHaveBeenCalled();
    expect(deleteWishlistProduct).not.toHaveBeenCalled();
  });

  it('keeps out-of-stock items from moving to the cart', async () => {
    mockWishlist([{ ...product, stockStatus: 'Out of Stock' }]);
    renderPage();

    await screen.findByText('Wishlist Product');
    const moveButton = screen.getByRole('button', { name: /Out of stock/i });

    expect(moveButton).toBeDefined();
    expect((moveButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows an action error when moving to cart fails', async () => {
    mockWishlist([productWithoutOptions]);
    addCartItem.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: { message: 'Only 0 Wishlist Product items are available' },
      }),
    });
    renderPage();

    await screen.findByText('Wishlist Product');
    await userEvent.click(screen.getByRole('button', { name: /Move to cart/i }));

    expect(await screen.findByText(/Only 0 Wishlist Product items are available/i)).toBeDefined();
    expect(screen.getByText('Wishlist Product')).toBeDefined();
    expect(deleteWishlistProduct).not.toHaveBeenCalled();
  });

  it('shows an action error and reloads when remove fails', async () => {
    mockWishlist([product]);
    deleteWishlistProduct.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue({ message: 'Remove failed' }),
    });
    renderPage();

    await screen.findByText('Wishlist Product');
    await userEvent.click(screen.getByRole('button', { name: /Remove Wishlist Product/i }));

    expect(await screen.findByText(/Remove failed/i)).toBeDefined();
    expect(screen.getByText('Wishlist Product')).toBeDefined();
    expect(refetchWishlist).toHaveBeenCalled();
  });
});
