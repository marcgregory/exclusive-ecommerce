/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from './ProductCard';
import type { Product, ProductVariant } from '../types';

const product: Product = {
  id: 'p1',
  name: 'Test Product',
  category: 'test',
  description: 'A great product.',
  price: 1999,
  originalPrice: 2499,
  discountPercent: 20,
  rating: 4,
  reviewCount: 12,
  stockStatus: 'In Stock',
  colors: ['red'],
  sizes: ['S'],
  isNew: true,
  flags: ['bestseller'],
  image: 'default',
};

const productWithoutOptions: Product = {
  ...product,
  colors: [],
  sizes: [],
};

describe('ProductCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the product details and actions', () => {
    render(
      <ProductCard
        product={product}
        onAdd={vi.fn()}
        onWishlist={vi.fn()}
        navigate={vi.fn()}
        isInWishlist={false}
      />
    );

    expect(screen.getByText('Test Product')).toBeDefined();
    expect(screen.getByText('$1999')).toBeDefined();
    expect(screen.getByText('$2499')).toBeDefined();
    expect(screen.getByText(/-20%/)).toBeDefined();
    expect(screen.getByText('NEW')).toBeDefined();
    expect(screen.getByText('(12)')).toBeDefined();
    expect(screen.getByRole('button', { name: /Choose Options/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /View Test Product/i })).toBeDefined();
  });

  it('calls handlers for add, wishlist, and navigation', async () => {
    const onAdd = vi.fn();
    const onWishlist = vi.fn();
    const navigate = vi.fn();

    const { container } = render(
      <ProductCard
        product={productWithoutOptions}
        onAdd={onAdd}
        onWishlist={onWishlist}
        navigate={navigate}
        isInWishlist={false}
      />
    );

    const user = userEvent.setup();
    const wishlistButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Wishlist Test Product"]'
    );
    const viewButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="View Test Product"]'
    );
    const addToCartButton = container.querySelector<HTMLButtonElement>('button.add-cart');
    const titleButton = container.querySelector<HTMLButtonElement>('button.product-card__title');

    await user.click(wishlistButton!);
    await user.click(viewButton!);
    await user.click(addToCartButton!);
    await user.click(titleButton!);

    expect(onWishlist).toHaveBeenCalledWith('p1');
    expect(onAdd).toHaveBeenCalledWith('p1', 1, '', '');
    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(1, '/product/p1');
    expect(navigate).toHaveBeenNthCalledWith(2, '/product/p1');
  });

  it('routes variant products to detail when variant stock is not loaded', async () => {
    const onAdd = vi.fn();
    const navigate = vi.fn();

    render(
      <ProductCard product={product} onAdd={onAdd} onWishlist={vi.fn()} navigate={navigate} />
    );

    await userEvent.click(screen.getByRole('button', { name: /Choose Options/i }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/product/p1');
  });

  it('quick adds the first valid in-stock variant when variant data is available', async () => {
    const onAdd = vi.fn();
    const navigate = vi.fn();
    const variants: ProductVariant[] = [
      { id: 'v-red-s', productId: 'p1', sku: 'RED-S', color: 'red', size: 'S', stock: 0 },
      { id: 'v-blue-m', productId: 'p1', sku: 'BLUE-M', color: 'blue', size: 'M', stock: 5 },
    ];

    render(
      <ProductCard
        product={{ ...product, colors: ['red', 'blue'], sizes: ['S', 'M'] }}
        variants={variants}
        onAdd={onAdd}
        onWishlist={vi.fn()}
        navigate={navigate}
        isInWishlist={false}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /Add To Cart/i }));

    expect(onAdd).toHaveBeenCalledWith('p1', 1, 'blue', 'M');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('disables the add to cart button when out of stock', () => {
    render(
      <ProductCard
        product={{ ...product, stockStatus: 'Out of Stock', isNew: false }}
        onAdd={vi.fn()}
        onWishlist={vi.fn()}
        navigate={vi.fn()}
      />
    );

    const outOfStockButton = screen.getByRole('button', {
      name: /Out of stock/i,
    }) as HTMLButtonElement;
    expect(outOfStockButton.disabled).toBe(true);
    expect(screen.getByText('OUT OF STOCK')).toBeDefined();
  });

  it('renders a secondary action and optionally hides the wishlist button', () => {
    const { container } = render(
      <ProductCard
        product={product}
        onAdd={vi.fn()}
        onWishlist={vi.fn()}
        navigate={vi.fn()}
        showWishlistButton={false}
        secondaryAction={<button>Secondary</button>}
        isInWishlist={false}
      />
    );

    const wishlistButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Wishlist Test Product"]'
    );
    expect(wishlistButton).toBeNull();
    expect(screen.getByText('Secondary')).toBeDefined();
  });
});
