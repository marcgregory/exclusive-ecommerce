/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage';
import type { Category, Product } from '../types';

const makeProduct = (id: string, flags: string[] = []): Product => ({
  id,
  name: id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' '),
  category: 'electronics',
  description: `${id} description`,
  price: 100,
  originalPrice: 120,
  discountPercent: 10,
  rating: 4,
  reviewCount: 12,
  stockStatus: 'In Stock',
  colors: [],
  sizes: [],
  isNew: false,
  flags,
  image: 'placeholder',
  imageUrl: '/assets/home/canon-camera.png',
});

const categories: Category[] = [
  {
    id: 'electronics',
    label: 'Electronics',
    slug: 'electronics',
    icon: 'monitor',
    children: [],
  },
];

const renderHome = (products: Product[]) =>
  render(
    <HomePage
      products={products}
      categories={categories}
      navigate={vi.fn()}
      onAdd={vi.fn()}
      onWishlist={vi.fn()}
      wishlistProductIds={[]}
    />
  );

describe('HomePage responsive view all actions', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('max-width: 560px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    // @ts-ignore - Ignore TypeScript error for global in test environment
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps Best Selling View All enabled on mobile when more than one item exists', () => {
    renderHome([
      makeProduct('north-coat', ['best']),
      makeProduct('gucci-bag', ['best']),
      makeProduct('rgb-cooler', ['flash']),
      makeProduct('bookshelf', ['explore']),
    ]);

    const viewAllButton = screen.getByRole('button', { name: 'View All' });
    expect(viewAllButton).toBeEnabled();
    const bestSellingSection = viewAllButton.closest('section');
    if (!bestSellingSection) {
      throw new Error('Could not find best selling section');
    }
    expect(within(bestSellingSection).getByRole('button', { name: 'North Coat' })).toBeInTheDocument();
    expect(within(bestSellingSection).queryByRole('button', { name: 'Gucci Bag' })).not.toBeInTheDocument();
  });
});
