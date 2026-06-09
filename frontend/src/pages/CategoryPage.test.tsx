/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { CategoryPage } from "./CategoryPage";
import { ecommerceApi } from "../api/ecommerceApi";
import type { Category, Product } from "../types";

const categories: Category[] = [
  {
    id: "electronics",
    label: "Electronics",
    slug: "electronics",
    icon: "device",
    children: [],
  },
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
  sizes: [],
  isNew: false,
  flags: ["flash", "best"],
  image: "default",
};

type FetchResponse = { products: Product[]; total: number; page: number; limit: number };

let mockResponse: FetchResponse = {
  products: [product],
  total: 36,
  page: 2,
  limit: 12,
};

globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
  const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
  const urlObj = new URL(urlStr, "http://localhost");
  const path = urlObj.pathname;

  if (path === "/api/products") {
    return new Response(JSON.stringify(mockResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return Promise.reject(new Error(`Unexpected fetch: ${path}`));
}) as any;

function renderPage(overrides: Partial<Parameters<typeof CategoryPage>[0]> = {}) {
  const store = configureStore({
    reducer: { [ecommerceApi.reducerPath]: ecommerceApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(ecommerceApi.middleware),
  });

  const props = {
    categorySlug: "electronics",
    query: new URLSearchParams(),
    categories,
    navigate: vi.fn(),
    onAdd: vi.fn().mockResolvedValue(undefined),
    onWishlist: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  const view = render(
    <Provider store={store}>
      <CategoryPage {...props} />
    </Provider>
  );
  return { ...props, ...view };
}

describe("CategoryPage", () => {
  beforeEach(() => {
    vi.mocked(globalThis.fetch).mockClear();
    mockResponse = { products: [product], total: 36, page: 2, limit: 12 };
  });

  afterEach(() => {
    cleanup();
  });

  it("fetches products with URL-derived sort, flag, and page", async () => {
    mockResponse = { products: [product], total: 13, page: 2, limit: 12 };
    renderPage({
      query: new URLSearchParams("sort=price-desc&flag=flash&page=2"),
    });

    expect(await screen.findByText("Gaming Keyboard")).toBeDefined();
    expect(screen.getByText(/Page 2 of 2 - 13 products/i)).toBeDefined();

    // Verify query params were sent — RTK Query passes a Request object to fetch
    const fetchCalls = vi.mocked(globalThis.fetch).mock.calls;
    const firstArg = fetchCalls[0][0];
    const calledUrl = firstArg instanceof Request ? firstArg.url : String(firstArg);
    expect(calledUrl).toContain("category=electronics");
    expect(calledUrl).toContain("flag=flash");
    expect(calledUrl).toContain("sort=price-desc");
    expect(calledUrl).toContain("page=2");
  });

  it("updates the URL when changing product filters", async () => {
    const navigate = vi.fn();
    renderPage({ navigate, query: new URLSearchParams("sort=rating&page=3") });

    await userEvent.click(screen.getByRole("button", { name: /Sale/i }));
    expect(navigate).toHaveBeenCalledWith("/category/electronics?sort=rating&flag=flash");

    await userEvent.click(screen.getByRole("button", { name: /Best Selling/i }));
    expect(navigate).toHaveBeenCalledWith("/category/electronics?sort=rating&flag=best");
  });

  it("updates the URL when changing sort and resets pagination", async () => {
    const navigate = vi.fn();
    renderPage({
      navigate,
      searchQuery: "keyboard",
      categorySlug: undefined,
      query: new URLSearchParams("q=keyboard&flag=best&page=4"),
    });

    await userEvent.selectOptions(screen.getByLabelText(/Sort by/i), "price-asc");

    expect(navigate).toHaveBeenCalledWith("/search?q=keyboard&sort=price-asc&flag=best");
  });

  it("updates only the page URL param during pagination", async () => {
    const navigate = vi.fn();
    renderPage({
      navigate,
      query: new URLSearchParams("sort=rating&flag=best&page=2"),
    });

    await screen.findByText("Gaming Keyboard");
    await userEvent.click(screen.getByRole("button", { name: /Previous/i }));
    expect(navigate).toHaveBeenCalledWith("/category/electronics?sort=rating&flag=best");

    await userEvent.click(screen.getByRole("button", { name: /Next/i }));
    expect(navigate).toHaveBeenCalledWith("/category/electronics?sort=rating&flag=best&page=3");
  });

  it("shows a clear-filters action for empty filtered results", async () => {
    const navigate = vi.fn();
    mockResponse = { products: [], total: 0, page: 1, limit: 12 };
    renderPage({
      navigate,
      query: new URLSearchParams("flag=flash&sort=rating"),
    });

    expect(await screen.findByText(/No sale products are available/i)).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: /Clear Filters/i }));

    expect(navigate).toHaveBeenCalledWith("/category/electronics");
  });
});
