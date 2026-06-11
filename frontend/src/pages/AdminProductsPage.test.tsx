/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AdminProductsPage } from './AdminProductsPage';
import { ecommerceApi } from '../api/ecommerceApi';
import type { Category, Product, PublicUser } from '../types';

const admin: PublicUser = {
  id: 'admin-1',
  firstName: 'Ada',
  lastName: 'Admin',
  email: 'admin@example.com',
  address: '1 Admin Way',
  role: 'admin',
};

const customer: PublicUser = {
  ...admin,
  id: 'customer-1',
  role: 'customer',
};

const categories: Category[] = [
  { id: 'electronics', label: 'Electronics', slug: 'electronics', icon: 'device', children: [] },
  { id: 'fashion', label: 'Fashion', slug: 'fashion', icon: 'shirt', children: [] },
];

const product: Product = {
  id: 'product-1',
  name: 'Gaming Keyboard',
  category: 'electronics',
  description: 'A responsive keyboard.',
  price: 9900,
  originalPrice: 12900,
  discountPercent: 23,
  rating: 4.8,
  reviewCount: 42,
  stockStatus: 'In Stock',
  colors: ['Black'],
  sizes: ['M'],
  isNew: false,
  flags: ['best'],
  image: 'keyboard',
};

const variants = [
  {
    id: 'variant-1',
    productId: 'product-1',
    color: 'Black',
    size: 'M',
    sku: 'KEY-BLK-M',
    stock: 4,
  },
];

let serverProducts: Product[] = [product];
let variantErrorStatus: number | null = null;

beforeEach(() => {
  serverProducts = [product];
  variantErrorStatus = null;
  vi.mocked(globalThis.fetch).mockClear();
});

globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
  let urlStr: string;
  let method: string;

  if (typeof url === 'string') {
    urlStr = url;
    method = options?.method || 'GET';
  } else if (url instanceof URL) {
    urlStr = url.toString();
    method = options?.method || 'GET';
  } else {
    // Request object
    urlStr = url.url;
    method = url.method;
  }

  const urlObj = new URL(urlStr, 'http://localhost');
  const path = urlObj.pathname;
  const search = urlObj.search;
  console.log(`[FETCH] ${method} ${path} (full: ${urlStr})`);

  // Parse body safely from Request object or options
  let body: any = null;
  if (url instanceof Request) {
    try {
      const text = await url.clone().text();
      if (text) {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          body = JSON.parse(trimmed);
        }
      }
    } catch {
      // Ignore parsing errors for non-JSON content
    }
  } else if (options?.body) {
    if (typeof options.body === 'string') {
      const trimmed = options.body.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          body = JSON.parse(trimmed);
        } catch {
          // Ignore parsing errors for non-JSON content
        }
      }
    }
  }

  // Categories
  if (path === '/api/categories') {
    return new Response(JSON.stringify({ categories }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Products list (GET only!)
  if (path === '/api/admin/products' && method === 'GET') {
    const params = new URLSearchParams(search);
    const q = params.get('q');
    const filtered = !q
      ? serverProducts
      : serverProducts.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    return new Response(
      JSON.stringify({
        products: filtered,
        total: filtered.length,
        page: 1,
        limit: Number(params.get('limit') || '50'),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Product detail GET
  if (path.match(/^\/api\/admin\/products\/[^/]+$/) && method === 'GET') {
    const productId = path.split('/').pop();
    const found = serverProducts.find((p) => p.id === productId);
    if (found) {
      return new Response(JSON.stringify({ product: found }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
  }

  // Create product POST
  if (path === '/api/admin/products' && method === 'POST') {
    const newProduct: Product = {
      ...product,
      id: `product-${Date.now()}`,
      ...body,
    };
    serverProducts.push(newProduct);
    return new Response(JSON.stringify({ product: newProduct }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Update product PATCH
  if (path.match(/^\/api\/admin\/products\/[^/]+$/) && method === 'PATCH') {
    const productId = path.split('/').pop();
    const idx = serverProducts.findIndex((p) => p.id === productId);
    if (idx >= 0) {
      const updatedProduct = { ...serverProducts[idx], ...body };
      serverProducts[idx] = updatedProduct;
      return new Response(JSON.stringify({ product: updatedProduct }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
  }

  // Delete product
  if (path.match(/^\/api\/admin\/products\/[^/]+$/) && method === 'DELETE') {
    const productId = path.split('/').pop();
    serverProducts = serverProducts.filter((p) => p.id !== productId);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Variants GET
  if (path.match(/^\/api\/admin\/products\/[^/]+\/variants$/) && method === 'GET') {
    return new Response(JSON.stringify({ variants }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Variants PUT
  if (path.match(/^\/api\/admin\/products\/[^/]+\/variants$/) && method === 'PUT') {
    if (variantErrorStatus) {
      return new Response(JSON.stringify({ message: 'Stock must be a non-negative integer' }), {
        status: variantErrorStatus,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        variants: body.variants.map((v: any, i: number) => ({
          productId: 'product-1',
          ...v,
          id: v.id || `variant-${i + 2}`,
        })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Image upload
  if (path === '/api/admin/uploads/product-image' && method === 'POST') {
    return new Response(
      JSON.stringify({
        upload: {
          url: '/uploads/product-images/2026/06/uploaded-keyboard.png',
          key: '2026/06/uploaded-keyboard.png',
          width: 800,
          height: 600,
          contentType: 'image/png',
          size: 128,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  return Promise.reject(new Error(`Unexpected: ${method} ${path}`));
}) as any;

function renderPage(user: PublicUser | null = admin) {
  const props = {
    userState: { data: user, loading: false, error: '' },
    navigate: vi.fn(),
  };

  const store = configureStore({
    reducer: {
      [ecommerceApi.reducerPath]: ecommerceApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(ecommerceApi.middleware),
  });

  const view = render(
    <Provider store={store}>
      <AdminProductsPage {...props} />
    </Provider>
  );
  return { ...props, ...view, store };
}

describe('AdminProductsPage', () => {
  beforeEach(() => {
    serverProducts = [product];
    variantErrorStatus = null;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('does not load admin products for non-admin users', () => {
    renderPage(customer);
    expect(screen.getByText(/Admin access required/i)).toBeDefined();
  });

  it('loads and renders admin product rows', async () => {
    renderPage();
    const row = (await screen.findByText('Gaming Keyboard')).closest('article');
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText('Electronics (electronics)')).toBeDefined();
  });

  it('searches admin products with q', async () => {
    const actor = userEvent.setup();
    renderPage();
    await actor.type(screen.getByLabelText(/Product search/i), 'keyboard');
    await actor.click(screen.getByRole('button', { name: /Search/i }));
    expect(await screen.findByText('Gaming Keyboard')).toBeDefined();
  });

  it('creates a product and renders the returned row', async () => {
    const actor = userEvent.setup();
    renderPage();

    await screen.findByLabelText(/Name/i);
    await actor.type(screen.getByLabelText(/Name/i), 'New Hoodie');
    await actor.selectOptions(screen.getByLabelText(/Category/i), 'fashion');
    await actor.type(screen.getByLabelText(/Description/i), 'Warm cotton hoodie.');
    await actor.clear(screen.getByLabelText(/^Price$/i));
    await actor.type(screen.getByLabelText(/^Price$/i), '7500');
    await actor.clear(screen.getByLabelText(/Original price/i));
    await actor.type(screen.getByLabelText(/Original price/i), '9000');
    await actor.type(screen.getByLabelText(/Colors/i), 'Black, Cream');
    await actor.type(screen.getByLabelText(/Sizes/i), 'S, M');
    await actor.type(screen.getByLabelText(/Flags/i), 'flash, best');
    await actor.type(screen.getByLabelText(/Image URL or key/i), 'hoodie');
    await actor.click(screen.getByLabelText(/New arrival/i));
    await actor.click(screen.getByRole('button', { name: /Create Product/i }));

    await waitFor(() => {
      expect(screen.getByText('New Hoodie')).toBeDefined();
    });
  });

  it('uploads a product image and saves the returned URL in the image field', async () => {
    const actor = userEvent.setup();
    renderPage();

    await screen.findByLabelText(/Image URL or key/i);
    const file = new File(['image'], 'keyboard.png', { type: 'image/png' });
    await actor.upload(screen.getByLabelText(/Upload image/i), file);

    expect(await screen.findByText(/Image uploaded \(800x600\)/i)).toBeDefined();
    expect((screen.getByLabelText(/Image URL or key/i) as HTMLInputElement).value).toBe(
      '/uploads/product-images/2026/06/uploaded-keyboard.png'
    );
  });

  it('edits a product and updates the row', async () => {
    const actor = userEvent.setup();
    renderPage();

    const row = (await screen.findByText('Gaming Keyboard')).closest('article');
    await actor.click(within(row as HTMLElement).getByRole('button', { name: /Edit/i }));
    await actor.clear(screen.getByLabelText(/Name/i));
    await actor.type(screen.getByLabelText(/Name/i), 'Studio Keyboard');
    await actor.clear(screen.getByLabelText(/Flags/i));
    await actor.type(screen.getByLabelText(/Flags/i), 'related, best');
    await actor.click(screen.getByRole('button', { name: /Update Product/i }));

    await waitFor(() => {
      expect(screen.getByText('Studio Keyboard')).toBeDefined();
    });
  });

  it('loads and saves variants for the selected product', async () => {
    const actor = userEvent.setup();
    renderPage();

    const row = (await screen.findByText('Gaming Keyboard')).closest('article');
    await actor.click(within(row as HTMLElement).getByRole('button', { name: /Edit/i }));

    expect(await screen.findByDisplayValue('KEY-BLK-M')).toBeDefined();

    await actor.clear(screen.getByLabelText(/Variant 1 stock/i));
    await actor.type(screen.getByLabelText(/Variant 1 stock/i), '8');
    await actor.click(screen.getByRole('button', { name: /Add row/i }));
    await actor.type(screen.getByLabelText(/Variant 2 color/i), 'White');
    await actor.type(screen.getByLabelText(/Variant 2 size/i), 'L');
    await actor.type(screen.getByLabelText(/Variant 2 sku/i), 'KEY-WHT-L');
    await actor.clear(screen.getByLabelText(/Variant 2 stock/i));
    await actor.type(screen.getByLabelText(/Variant 2 stock/i), '3');
    await actor.click(screen.getByRole('button', { name: /Save variants/i }));

    expect(await screen.findByText(/Variants saved/i)).toBeDefined();
  });

  it('removes variant rows before saving', async () => {
    const actor = userEvent.setup();
    renderPage();

    const row = (await screen.findByText('Gaming Keyboard')).closest('article');
    await actor.click(within(row as HTMLElement).getByRole('button', { name: /Edit/i }));

    await screen.findByDisplayValue('KEY-BLK-M');
    await actor.click(screen.getByRole('button', { name: /Delete variant 1/i }));
    await actor.click(screen.getByRole('button', { name: /Save variants/i }));

    expect(await screen.findByText(/Variants saved/i)).toBeDefined();
  });

  it('shows variant API errors', async () => {
    const actor = userEvent.setup();
    variantErrorStatus = 400;
    renderPage();

    const row = (await screen.findByText('Gaming Keyboard')).closest('article');
    await actor.click(within(row as HTMLElement).getByRole('button', { name: /Edit/i }));
    await screen.findByDisplayValue('KEY-BLK-M');
    await actor.click(screen.getByRole('button', { name: /Save variants/i }));

    await waitFor(() => {
      expect(screen.getByText(/Stock must be a non-negative integer/i)).toBeDefined();
    });
  });

  it('deletes a product after confirmation', async () => {
    const actor = userEvent.setup();
    renderPage();

    const row = (await screen.findByText('Gaming Keyboard')).closest('article');
    await actor.click(within(row as HTMLElement).getByRole('button', { name: /Delete/i }));

    await waitFor(() => {
      expect(screen.queryByText('Gaming Keyboard')).toBeNull();
    });
  });
});
