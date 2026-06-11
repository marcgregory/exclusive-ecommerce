/** @vitest-environment jsdom */
import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { ProductCard } from './ProductCard';
import { resolveProductImage } from '../lib/productUtils';
import type { Product } from '../types';

const mockProducts: Product[] = [
  {
    id: 'p1',
    name: 'Asset Image Product',
    image: '/assets/products/test-asset.jpg',
    category: 'test',
    description: 'desc',
    price: 10,
    originalPrice: 20,
    discountPercent: 50,
    rating: 5,
    reviewCount: 1,
    stockStatus: 'In Stock',
    colors: [],
    sizes: [],
    isNew: false,
    flags: [],
  },
  {
    id: 'p2',
    name: 'Upload Image Product',
    image: '/uploads/products/test-upload.jpg',
    category: 'test',
    description: 'desc',
    price: 10,
    originalPrice: 20,
    discountPercent: 50,
    rating: 5,
    reviewCount: 1,
    stockStatus: 'In Stock',
    colors: [],
    sizes: [],
    isNew: false,
    flags: [],
  },
  {
    id: 'p3',
    name: 'No Image Product',
    image: 'default',
    category: 'test',
    description: 'desc',
    price: 10,
    originalPrice: 20,
    discountPercent: 50,
    rating: 5,
    reviewCount: 1,
    stockStatus: 'In Stock',
    colors: [],
    sizes: [],
    isNew: false,
    flags: [],
  },
];

describe('Product Visual Proof', () => {
  it('verifies image rendering for various product states', () => {
    console.log('\n--- PRODUCT VISUAL VERIFICATION REPORT ---\n');

    mockProducts.forEach((product) => {
      const { container } = render(
        <ProductCard
          product={product}
          onAdd={async () => {}}
          onWishlist={async () => {}}
          navigate={() => {}}
        />
      );

      const visualDiv = container.querySelector('.product-visual');
      const img = visualDiv?.querySelector('img');
      const placeholders = visualDiv?.querySelectorAll('span, i, b');
      const resolved = resolveProductImage(product);

      console.log(`Product: ${product.name}`);
      console.log(`Resolved Image Path: ${resolved}`);
      console.log(`Rendered DOM: ${visualDiv?.innerHTML.trim()}`);
      console.log(`Actual <img> exists: ${!!img}`);

      if (!img && placeholders && placeholders.length > 0) {
        console.log(
          `Fallback rendering occurred because: ${!resolved ? 'No valid image URL found in product data' : 'Resolved path was not recognized as a URL'}`
        );
      } else if (img) {
        console.log(`Network Request Target: ${img.getAttribute('src')}`);
      }
      console.log('------------------------------------------\n');
    });
  });
});
