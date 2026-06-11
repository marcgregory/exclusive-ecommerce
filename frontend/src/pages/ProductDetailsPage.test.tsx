/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductDetailsPage } from './ProductDetailsPage';
import type { Product, ProductDetailResponse, ProductVariant } from '../types';

vi.mock('../api/ecommerceApi', () => ({
  useAddCartItemMutation: vi.fn(),
  useAddWishlistProductMutation: vi.fn(),
  useDeleteWishlistProductMutation: vi.fn(),
  useGetProductDetailQuery: vi.fn(),
}));
import {
  useAddCartItemMutation,
  useAddWishlistProductMutation,
  useDeleteWishlistProductMutation,
  useGetProductDetailQuery,
} from '../api/ecommerceApi';

const mockedUseGetProductDetailQuery = useGetProductDetailQuery as unknown as Mock;
const mockedUseAddCartItemMutation = useAddCartItemMutation as unknown as Mock;
const mockedUseAddWishlistProductMutation = useAddWishlistProductMutation as unknown as Mock;
const mockedUseDeleteWishlistProductMutation = useDeleteWishlistProductMutation as unknown as Mock;
let addCartItem: Mock;
let addWishlistProduct: Mock;
let deleteWishlistProduct: Mock;
let refetchProduct: Mock;

const product: Product = {
  id: 'p1',
  name: 'Detail Product',
  category: 'electronics',
  description: 'A detailed product description.',
  price: 1999,
  originalPrice: 2499,
  discountPercent: 20,
  rating: 4,
  reviewCount: 12,
  stockStatus: 'In Stock',
  colors: ['red', 'blue'],
  sizes: ['S', 'M'],
  isNew: true,
  flags: ['best'],
  image: 'default',
};

const relatedProduct: Product = {
  ...product,
  id: 'p2',
  name: 'Related Product',
  colors: [],
  sizes: [],
  image: 'gamepad-red',
};

const variants: ProductVariant[] = [
  { id: 'v-red-s', productId: 'p1', sku: 'DETAIL-RED-S', color: 'red', size: 'S', stock: 0 },
  { id: 'v-red-m', productId: 'p1', sku: 'DETAIL-RED-M', color: 'red', size: 'M', stock: 3 },
  { id: 'v-blue-s', productId: 'p1', sku: 'DETAIL-BLUE-S', color: 'blue', size: 'S', stock: 7 },
  { id: 'v-blue-m', productId: 'p1', sku: 'DETAIL-BLUE-M', color: 'blue', size: 'M', stock: 0 },
];

const response: ProductDetailResponse = {
  product,
  variants,
  related: [relatedProduct],
};

function renderPage(overrides: Partial<Parameters<typeof ProductDetailsPage>[0]> = {}) {
  const props = {
    id: 'p1',
    navigate: vi.fn(),
    onAdd: vi.fn().mockResolvedValue(undefined),
    onWishlist: vi.fn().mockResolvedValue(undefined),
    wishlistProductIds: [],
    ...overrides,
  };

  const view = render(<ProductDetailsPage {...props} />);
  return { ...props, ...view };
}

describe('ProductDetailsPage', () => {
  beforeEach(() => {
    refetchProduct = vi.fn();
    addCartItem = vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) }));
    addWishlistProduct = vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) }));
    deleteWishlistProduct = vi.fn(() => ({ unwrap: vi.fn().mockResolvedValue({}) }));
    mockedUseGetProductDetailQuery.mockReturnValue({
      data: response,
      error: undefined,
      isLoading: false,
      refetch: refetchProduct,
    });
    mockedUseAddCartItemMutation.mockReturnValue([addCartItem, {}]);
    mockedUseAddWishlistProductMutation.mockReturnValue([addWishlistProduct, {}]);
    mockedUseDeleteWishlistProductMutation.mockReturnValue([deleteWishlistProduct, {}]);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows loading state while product details are loading', () => {
    mockedUseGetProductDetailQuery.mockReturnValue({
      data: null,
      error: undefined,
      isLoading: true,
      refetch: refetchProduct,
    });
    renderPage();

    // Check for skeleton elements instead of loading text
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('skeleton-text');
    // Check that ProductVisual placeholders are rendered
    expect(screen.getAllByTestId(/product-visual/i).length).toBeGreaterThan(0);
    // Check that the quantity stepper and buy button skeletons are rendered
    expect(screen.getByTestId('quantity-stepper-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('product-button-skeleton')).toBeInTheDocument();
  });

  it('shows product detail errors and lets shoppers retry or return to the shop', async () => {
    const navigate = vi.fn();
    mockedUseGetProductDetailQuery.mockReturnValue({
      data: undefined,
      error: { status: 404, data: { message: 'Product unavailable' } },
      isLoading: false,
      refetch: refetchProduct,
    });
    renderPage({ navigate });

    expect(screen.getByText(/We could not load this product/i)).toBeDefined();
    expect(screen.getByText(/Product unavailable/i)).toBeDefined();

    await userEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    expect(refetchProduct).toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: /Return To Shop/i }));
    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('shows product details and related products', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Detail Product' })).toBeDefined();
    expect(screen.getAllByText('$1999').length).toBeGreaterThan(0);
    expect(screen.getByText('A detailed product description.')).toBeDefined();
    expect(screen.getByText('(12 Reviews)')).toBeDefined();
    expect(screen.getByText('In Stock')).toBeDefined();
    expect(screen.getByText(/Choose a colour and size to check stock/i)).toBeDefined();
    expect(screen.getByText('Related Product')).toBeDefined();
  });

  it('adds an available in-stock variant to cart with stock and SKU feedback', async () => {
    renderPage();

    const buyButton = screen.getByRole('button', { name: /Buy Now/i }) as HTMLButtonElement;
    expect(buyButton.disabled).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: /Color red/i }));
    expect(buyButton.disabled).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'M' }));
    expect(buyButton.disabled).toBe(false);
    expect(screen.getByText(/SKU: DETAIL-RED-M \| 3 in stock/i)).toBeDefined();

    await userEvent.click(buyButton);
    expect(addCartItem).toHaveBeenCalledWith({
      productId: 'p1',
      quantity: 1,
      selectedColor: 'red',
      selectedSize: 'M',
    });
  });

  it('disables unavailable color and size combinations', async () => {
    renderPage();

    screen.getByRole('heading', { name: 'Detail Product' });
    await userEvent.click(screen.getByRole('button', { name: /Color red/i }));

    const unavailableSize = screen.getByRole('button', { name: 'S' }) as HTMLButtonElement;
    const availableSize = screen.getByRole('button', { name: 'M' }) as HTMLButtonElement;
    expect(unavailableSize.disabled).toBe(true);
    expect(availableSize.disabled).toBe(false);

    await userEvent.click(availableSize);
    const unavailableColor = screen.getByRole('button', {
      name: /Color blue/i,
    }) as HTMLButtonElement;
    expect(unavailableColor.disabled).toBe(true);
  });

  it('requires shoppers to select an in-stock variant before adding to cart', async () => {
    mockedUseGetProductDetailQuery.mockReturnValue({
      data: {
        product,
        variants: [
          {
            id: 'v-red-s',
            productId: 'p1',
            sku: 'DETAIL-RED-S',
            color: 'red',
            size: 'S',
            stock: 0,
          },
        ],
        related: [],
      },
      error: undefined,
      isLoading: false,
      refetch: refetchProduct,
    });
    renderPage();

    screen.getByRole('heading', { name: 'Detail Product' });
    await userEvent.click(screen.getByRole('button', { name: /Color red/i }));

    const buyButton = screen.getByRole('button', { name: /Buy Now/i }) as HTMLButtonElement;
    expect((screen.getByRole('button', { name: 'S' }) as HTMLButtonElement).disabled).toBe(true);
    expect(buyButton.disabled).toBe(true);
    await userEvent.click(buyButton);

    expect(addCartItem).not.toHaveBeenCalled();
  });

  it('passes the selected quantity to add to cart', async () => {
    const { container } = renderPage();

    screen.getByRole('heading', { name: 'Detail Product' });
    await userEvent.click(screen.getByRole('button', { name: /Color blue/i }));
    await userEvent.click(screen.getByRole('button', { name: 'S' }));

    const quantityButtons = container.querySelectorAll<HTMLButtonElement>('.quantity button');
    await userEvent.click(quantityButtons[1]);
    await userEvent.click(quantityButtons[1]);
    await userEvent.click(screen.getByRole('button', { name: /Buy Now/i }));

    await waitFor(() =>
      expect(addCartItem).toHaveBeenCalledWith({
        productId: 'p1',
        quantity: 3,
        selectedColor: 'blue',
        selectedSize: 'S',
      })
    );
  });

  it('shows a stock error when add to cart fails', async () => {
    addCartItem.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue({
        status: 409,
        data: { message: 'Only 0 Detail Product items are available' },
      }),
    });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /Color blue/i }));
    await userEvent.click(screen.getByRole('button', { name: 'S' }));
    await userEvent.click(screen.getByRole('button', { name: /Buy Now/i }));

    expect(await screen.findByText(/Only 0 Detail Product items are available/i)).toBeDefined();
  });

  it('disables the buy action when the product is out of stock', async () => {
    mockedUseGetProductDetailQuery.mockReturnValue({
      data: {
        product: { ...product, stockStatus: 'Out of Stock' },
        variants,
        related: [],
      },
      error: undefined,
      isLoading: false,
      refetch: refetchProduct,
    });
    renderPage();

    const outOfStockButton = screen.getByRole('button', {
      name: /Out of stock/i,
    }) as HTMLButtonElement;
    expect(outOfStockButton.disabled).toBe(true);
    expect(screen.getAllByText('Out of stock').length).toBeGreaterThan(0);
  });

  it('adds the product to the wishlist', async () => {
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /Add to wishlist/i }));

    expect(addWishlistProduct).toHaveBeenCalledWith('p1');
  });

  it('shows an action error when add to wishlist fails', async () => {
    addWishlistProduct.mockReturnValueOnce({
      unwrap: vi.fn().mockRejectedValue({ message: 'Wishlist failed' }),
    });
    renderPage();

    await userEvent.click(screen.getByRole('button', { name: /Add to wishlist/i }));

    expect(await screen.findByText(/Wishlist failed/i)).toBeDefined();
  });
});
