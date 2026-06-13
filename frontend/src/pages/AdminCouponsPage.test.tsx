/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AdminCouponsPage } from './AdminCouponsPage';
import { ecommerceApi } from '../api/ecommerceApi';
import type { Coupon, PublicUser } from '../types';

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

const coupon: Coupon = {
  code: 'EXCLUSIVE10',
  type: 'percent',
  amount: 10,
  active: true,
};

const fixedCoupon: Coupon = {
  code: 'SAVE50',
  type: 'fixed',
  amount: 50,
  active: false,
};

let serverCoupons: Coupon[] = [coupon, fixedCoupon];
let simulateDeleteError = false;

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
    urlStr = url.url;
    method = url.method;
  }

  const urlObj = new URL(urlStr, 'http://localhost');
  const path = urlObj.pathname;
  console.log(`[FETCH] ${method} ${path} (full: ${urlStr})`);

  let body: any = null;
  if (url instanceof Request) {
    try {
      const text = await url.clone().text();
      if (text) body = JSON.parse(text);
    } catch {
      // Ignore non-JSON request bodies in this fetch mock.
    }
  } else if (options?.body && typeof options.body === 'string') {
    try {
      body = JSON.parse(options.body);
    } catch {
      // Ignore non-JSON request bodies in this fetch mock.
    }
  }

  // List coupons
  if (path === '/api/admin/coupons' && method === 'GET') {
    return new Response(JSON.stringify({ coupons: serverCoupons }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create coupon
  if (path === '/api/admin/coupons' && method === 'POST') {
    const newCoupon: Coupon = { ...body };
    serverCoupons = [newCoupon, ...serverCoupons];
    return new Response(JSON.stringify({ coupon: newCoupon }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Update coupon PATCH
  if (path.match(/^\/api\/admin\/coupons\/[^/]+$/) && method === 'PATCH') {
    const code = decodeURIComponent(path.split('/').pop()!);
    const idx = serverCoupons.findIndex((c) => c.code === code);
    if (idx >= 0) {
      const updatedCoupon = { ...serverCoupons[idx], ...body };
      serverCoupons[idx] = updatedCoupon;
      return new Response(JSON.stringify({ coupon: updatedCoupon }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
  }

  // Delete coupon
  if (path.match(/^\/api\/admin\/coupons\/[^/]+$/) && method === 'DELETE') {
    if (simulateDeleteError) {
      return new Response(JSON.stringify({ message: 'Coupon could not be deleted' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const code = decodeURIComponent(path.split('/').pop()!);
    serverCoupons = serverCoupons.filter((c) => c.code !== code);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return Promise.reject(new Error(`Unexpected API call: ${method} ${path}`));
}) as any;

async function getFetchCall(pathSubstring: string, method: string) {
  for (const [req, opts] of vi.mocked(globalThis.fetch).mock.calls) {
    let url = '';
    let m = 'GET';
    if (typeof req === 'string') {
      url = req;
      m = opts?.method || 'GET';
    } else if (req instanceof URL) {
      url = req.toString();
      m = opts?.method || 'GET';
    } else if (req && typeof req === 'object' && 'url' in req) {
      url = req.url;
      m = req.method;
    }
    if (url.includes(pathSubstring) && m.toUpperCase() === method.toUpperCase()) {
      let body: any = null;
      if (req instanceof Request) {
        try {
          const text = await req.clone().text();
          if (text) body = JSON.parse(text);
        } catch {
          // Ignore non-JSON request bodies in this fetch mock.
        }
      } else if (opts?.body && typeof opts.body === 'string') {
        try {
          body = JSON.parse(opts.body);
        } catch {
          // Ignore non-JSON request bodies in this fetch mock.
        }
      }
      return { url, method: m, body };
    }
  }
  return null;
}

function renderPage(user: PublicUser | null = admin) {
  const props = {
    userState: { data: user, loading: false, error: '' },
    navigate: vi.fn(),
    currentPath: '/admin/coupons',
  };

  const store = configureStore({
    reducer: {
      [ecommerceApi.reducerPath]: ecommerceApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(ecommerceApi.middleware),
  });

  const view = render(
    <Provider store={store}>
      <AdminCouponsPage {...props} />
    </Provider>
  );
  return { ...props, ...view, store };
}

describe('AdminCouponsPage', () => {
  beforeEach(() => {
    serverCoupons = [coupon, fixedCoupon];
    simulateDeleteError = false;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    serverCoupons = [coupon, fixedCoupon];
    simulateDeleteError = false;
    vi.restoreAllMocks();
    cleanup();
  });

  it('does not load coupon management for non-admin users', () => {
    renderPage(customer);

    expect(screen.getByText(/Admin access required/i)).toBeDefined();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('loads and renders coupon rows for admins', async () => {
    renderPage();

    await waitFor(async () => {
      const call = await getFetchCall('/api/admin/coupons', 'GET');
      expect(call).toBeTruthy();
    });
    const row = (await screen.findByText('EXCLUSIVE10')).closest('article');
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText('10% off')).toBeDefined();
    expect(within(row as HTMLElement).getByText('Percent')).toBeDefined();
    expect(screen.getByText('1 active')).toBeDefined();
    expect(screen.getByText('1 inactive')).toBeDefined();
  });

  it('creates a fixed inactive coupon and renders the returned row', async () => {
    const actor = userEvent.setup();
    serverCoupons = [];
    renderPage();

    await actor.type(await screen.findByLabelText(/Code/i), 'vip25');
    await actor.selectOptions(screen.getByLabelText(/Discount type/i), 'fixed');
    await actor.clear(screen.getByLabelText(/Amount/i));
    await actor.type(screen.getByLabelText(/Amount/i), '25');
    await actor.click(screen.getByLabelText(/Active at checkout/i));
    await actor.click(screen.getByRole('button', { name: /Create Coupon/i }));

    let body: any = null;
    await waitFor(async () => {
      const call = await getFetchCall('/api/admin/coupons', 'POST');
      expect(call).toBeTruthy();
      body = call?.body;
    });
    expect(body).toEqual({
      code: 'VIP25',
      type: 'fixed',
      amount: 25,
      active: false,
    });
    const row = (await screen.findAllByText('VIP25'))[0].closest('article');
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText('$25 off')).toBeDefined();
  });

  it('edits a coupon and updates the row', async () => {
    const actor = userEvent.setup();
    serverCoupons = [coupon];
    renderPage();

    const row = (await screen.findByText('EXCLUSIVE10')).closest('article');
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole('button', { name: /Edit/i }));
    await actor.clear(screen.getByLabelText(/Amount/i));
    await actor.type(screen.getByLabelText(/Amount/i), '15');
    await actor.click(screen.getByLabelText(/Active at checkout/i));
    await actor.click(screen.getByRole('button', { name: /Update Coupon/i }));

    let body: any = null;
    await waitFor(async () => {
      const call = await getFetchCall('/api/admin/coupons/EXCLUSIVE10', 'PATCH');
      expect(call).toBeTruthy();
      body = call?.body;
    });
    expect(body).toMatchObject({
      code: 'EXCLUSIVE10',
      amount: 15,
      active: false,
    });
    expect(await screen.findByText('15% off')).toBeDefined();
  });

  it('deletes a coupon on success', async () => {
    const actor = userEvent.setup();
    serverCoupons = [coupon];
    renderPage();

    const row = (await screen.findByText('EXCLUSIVE10')).closest('article');
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole('button', { name: /Delete/i }));

    await waitFor(async () => {
      const call = await getFetchCall('/api/admin/coupons/EXCLUSIVE10', 'DELETE');
      expect(call).toBeTruthy();
    });
    expect(screen.queryByText('EXCLUSIVE10')).toBeNull();
  });

  it('keeps a coupon visible when delete fails', async () => {
    const actor = userEvent.setup();
    simulateDeleteError = true;
    serverCoupons = [coupon];
    renderPage();

    const row = (await screen.findByText('EXCLUSIVE10')).closest('article');
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole('button', { name: /Delete/i }));

    expect(await screen.findByText(/Coupon could not be deleted/i)).toBeDefined();
    expect(screen.getByText('EXCLUSIVE10')).toBeDefined();
  });
});
