/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { AdminProductsPage } from "./AdminProductsPage";
import { ecommerceApi } from "../api/ecommerceApi";
import type { Category, Product, PublicUser } from "../types";

const admin: PublicUser = {
  id: "admin-1",
  firstName: "Ada",
  lastName: "Admin",
  email: "admin@example.com",
  address: "1 Admin Way",
  role: "admin",
};

const customer: PublicUser = {
  ...admin,
  id: "customer-1",
  role: "customer",
};

const categories: Category[] = [
  { id: "electronics", label: "Electronics", slug: "electronics", icon: "device", children: [] },
  { id: "fashion", label: "Fashion", slug: "fashion", icon: "shirt", children: [] },
];

const product: Product = {
  id: "product-1",
  name: "Gaming Keyboard",
  category: "electronics",
  description: "A responsive keyboard.",
  price: 9900,
  originalPrice: 12900,
  discountPercent: 23,
  rating: 4.8,
  reviewCount: 42,
  stockStatus: "In Stock",
  colors: ["Black"],
  sizes: ["M"],
  isNew: false,
  flags: ["best"],
  image: "keyboard",
};

const variants = [
  {
    id: "variant-1",
    productId: "product-1",
    color: "Black",
    size: "M",
    sku: "KEY-BLK-M",
    stock: 4,
  },
];

// Mock fetch globally  
type MockFetchParams = {
  path: string;
  method?: string;
  status?: number;
  body?: any;
};

let mockResponses: MockFetchParams[] = [];

function mockFetch(path: string, response: any, status: number = 200) {
  mockResponses.push({ path, status, body: response });
}

function getMockResponse(path: string, method: string = "GET") {
  const match = mockResponses.find(
    (r) => r.path === path && (r.method ? r.method === method : method === "GET")
  );
  return match;
}

globalThis.fetch = vi.fn((url: string | URL | Request, options?: RequestInit) => {
  const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : (url as Request).url;
  const urlObj = new URL(urlStr);
  const path = urlObj.pathname + urlObj.search;
  const method = options?.method || "GET";

  // Handle categories
  if (path === "/api/categories") {
    return Promise.resolve(
      new Response(JSON.stringify({ categories }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  // Handle admin products list
  if (path.startsWith("/api/admin/products?")) {
    const params = new URLSearchParams(urlObj.search);
    const q = params.get("q");
    const filtered = !q ? [product] : [product].filter((p) =>
      p.name.toLowerCase().includes(q.toLowerCase())
    );
    return Promise.resolve(
      new Response(JSON.stringify({
        products: filtered,
        total: filtered.length,
        page: 1,
        limit: Number(params.get("limit") || "50"),
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  // Handle admin product variants GET
  if (path === "/api/admin/products/product-1/variants" && method === "GET") {
    return Promise.resolve(
      new Response(JSON.stringify({ variants }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  // Handle admin product variants PUT
  if (path === "/api/admin/products/product-1/variants" && method === "PUT") {
    const mock = getMockResponse(path, "PUT");
    if (mock?.status && mock.status !== 200) {
      return Promise.resolve(
        new Response(JSON.stringify({ message: "Stock must be a non-negative integer" }), {
          status: mock.status,
          headers: { "Content-Type": "application/json" },
        })
      );
    }
    const body = JSON.parse(options?.body as string) as { variants: any[] };
    return Promise.resolve(
      new Response(JSON.stringify({
        variants: body.variants.map((v, i) => ({
          productId: "product-1",
          ...v,
          id: v.id || `variant-${i + 2}`,
        })),
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  // Handle admin products POST
  if (path === "/api/admin/products" && method === "POST") {
    const body = JSON.parse(options?.body as string) as Partial<Product>;
    return Promise.resolve(
      new Response(JSON.stringify({
        product: {
          ...product,
          id: "product-2",
          ...body,
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  // Handle admin product PATCH
  if (path === "/api/admin/products/product-1" && method === "PATCH") {
    const body = JSON.parse(options?.body as string) as Partial<Product>;
    return Promise.resolve(
      new Response(JSON.stringify({
        product: {
          ...product,
          ...body,
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  // Handle admin product DELETE
  if (path === "/api/admin/products/product-1" && method === "DELETE") {
    return Promise.resolve(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  // Handle product image upload
  if (path === "/api/admin/uploads/product-image" && method === "POST") {
    return Promise.resolve(
      new Response(JSON.stringify({
        upload: {
          url: "/uploads/product-images/2026/06/uploaded-keyboard.png",
          key: "2026/06/uploaded-keyboard.png",
          width: 800,
          height: 600,
          contentType: "image/png",
          size: 128,
        },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  return Promise.reject(new Error(`Unexpected fetch: ${path} ${method}`));
}) as any;

function renderPage(user: PublicUser | null = admin) {
  const props = {
    userState: { data: user, loading: false, error: "" },
    navigate: vi.fn(),
  };

  // Create a store with RTK Query
  const store = configureStore({
    reducer: {
      [ecommerceApi.reducerPath]: ecommerceApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(ecommerceApi.middleware),
  });

  const view = render(
    <Provider store={store}>
      <AdminProductsPage {...props} />
    </Provider>
  );
  return { ...props, ...view, store };
}

describe("AdminProductsPage", () => {
  beforeEach(() => {
    mockResponses = [];
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    mockResponses = [];
    vi.restoreAllMocks();
    cleanup();
  });

  it("does not load admin products for non-admin users", () => {
    renderPage(customer);

    expect(screen.getByText(/Admin access required/i)).toBeDefined();
  });

  it("loads and renders admin product rows", async () => {
    renderPage();

    const row = (await screen.findByText("Gaming Keyboard")).closest("article");
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText("Electronics (electronics)")).toBeDefined();
    expect(within(row as HTMLElement).getByText("keyboard")).toBeDefined();
  });

  it("searches admin products with q", async () => {
    const actor = userEvent.setup();
    renderPage();

    await actor.type(screen.getByLabelText(/Product search/i), "keyboard");
    await actor.click(screen.getByRole("button", { name: /Search/i }));

    expect(await screen.findByText("Gaming Keyboard")).toBeDefined();
  });

  it("creates a product and renders the returned row", async () => {
    const actor = userEvent.setup();
    renderPage();

    await screen.findByLabelText(/Name/i);
    await actor.type(screen.getByLabelText(/Name/i), "New Hoodie");
    await actor.selectOptions(screen.getByLabelText(/Category/i), "fashion");
    await actor.type(screen.getByLabelText(/Description/i), "Warm cotton hoodie.");
    await actor.clear(screen.getByLabelText(/^Price$/i));
    await actor.type(screen.getByLabelText(/^Price$/i), "7500");
    await actor.clear(screen.getByLabelText(/Original price/i));
    await actor.type(screen.getByLabelText(/Original price/i), "9000");
    await actor.type(screen.getByLabelText(/Colors/i), "Black, Cream");
    await actor.type(screen.getByLabelText(/Sizes/i), "S, M");
    await actor.type(screen.getByLabelText(/Flags/i), "flash, best");
    await actor.type(screen.getByLabelText(/Image URL or key/i), "hoodie");
    await actor.click(screen.getByLabelText(/New arrival/i));
    await actor.click(screen.getByRole("button", { name: /Create Product/i }));

    expect(await screen.findByText("New Hoodie")).toBeDefined();
  });

  it("uploads a product image and saves the returned URL in the image field", async () => {
    const actor = userEvent.setup();
    renderPage();

    await screen.findByLabelText(/Image URL or key/i);
    const file = new File(["image"], "keyboard.png", { type: "image/png" });
    await actor.upload(screen.getByLabelText(/Upload image/i), file);

    expect(await screen.findByText(/Image uploaded \(800x600\)/i)).toBeDefined();
    expect((screen.getByLabelText(/Image URL or key/i) as HTMLInputElement).value).toBe(
      "/uploads/product-images/2026/06/uploaded-keyboard.png",
    );
  });

  it("edits a product and updates the row", async () => {
    const actor = userEvent.setup();
    renderPage();

    const row = (await screen.findByText("Gaming Keyboard")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Edit/i }));
    await actor.clear(screen.getByLabelText(/Name/i));
    await actor.type(screen.getByLabelText(/Name/i), "Studio Keyboard");
    await actor.clear(screen.getByLabelText(/Flags/i));
    await actor.type(screen.getByLabelText(/Flags/i), "related, best");
    await actor.click(screen.getByRole("button", { name: /Update Product/i }));

    expect(await screen.findByText("Studio Keyboard")).toBeDefined();
  });

  it("loads and saves variants for the selected product", async () => {
    const actor = userEvent.setup();
    renderPage();

    const row = (await screen.findByText("Gaming Keyboard")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Edit/i }));

    expect(await screen.findByDisplayValue("KEY-BLK-M")).toBeDefined();

    await actor.clear(screen.getByLabelText(/Variant 1 stock/i));
    await actor.type(screen.getByLabelText(/Variant 1 stock/i), "8");
    await actor.click(screen.getByRole("button", { name: /Add row/i }));
    await actor.type(screen.getByLabelText(/Variant 2 color/i), "White");
    await actor.type(screen.getByLabelText(/Variant 2 size/i), "L");
    await actor.type(screen.getByLabelText(/Variant 2 sku/i), "KEY-WHT-L");
    await actor.clear(screen.getByLabelText(/Variant 2 stock/i));
    await actor.type(screen.getByLabelText(/Variant 2 stock/i), "3");
    await actor.click(screen.getByRole("button", { name: /Save variants/i }));

    expect(await screen.findByText(/Variants saved/i)).toBeDefined();
  });

  it("removes variant rows before saving", async () => {
    const actor = userEvent.setup();
    renderPage();

    const row = (await screen.findByText("Gaming Keyboard")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Edit/i }));

    await screen.findByDisplayValue("KEY-BLK-M");
    await actor.click(screen.getByRole("button", { name: /Delete variant 1/i }));
    await actor.click(screen.getByRole("button", { name: /Save variants/i }));

    expect(await screen.findByText(/Variants saved/i)).toBeDefined();
  });

  it("shows variant API errors", async () => {
    const actor = userEvent.setup();
    // Set mock to return error on variants PUT
    mockFetch("/api/admin/products/product-1/variants", { message: "Stock must be a non-negative integer" }, 400);
    renderPage();

    const row = (await screen.findByText("Gaming Keyboard")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Edit/i }));
    await screen.findByDisplayValue("KEY-BLK-M");
    await actor.click(screen.getByRole("button", { name: /Save variants/i }));

    expect(await screen.findByText(/Stock must be a non-negative integer/i)).toBeDefined();
  });

  it("deletes a product after confirmation", async () => {
    const actor = userEvent.setup();
    renderPage();

    const row = (await screen.findByText("Gaming Keyboard")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Delete/i }));

    expect(screen.queryByText("Gaming Keyboard")).toBeNull();
  });
});
