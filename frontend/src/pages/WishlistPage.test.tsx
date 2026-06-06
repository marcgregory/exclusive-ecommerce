/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WishlistPage } from "./WishlistPage";
import type { Product } from "../types";

vi.mock("../api/client", () => ({ api: vi.fn() }));
import { api } from "../api/client";

const mockedApi = vi.mocked(api);

const product: Product = {
  id: "p1",
  name: "Wishlist Product",
  category: "test",
  description: "A product saved for later",
  price: 1999,
  originalPrice: 2499,
  discountPercent: 20,
  rating: 4,
  reviewCount: 10,
  stockStatus: "In Stock",
  colors: ["red"],
  sizes: ["S"],
  isNew: false,
  flags: [],
  image: "default"
};

const secondProduct: Product = {
  ...product,
  id: "p2",
  name: "Second Wishlist Product",
  image: "gamepad-red"
};

const productWithoutOptions: Product = {
  ...product,
  colors: [],
  sizes: []
};

function mockWishlist(products: Product[]) {
  mockedApi.mockImplementation(async (path: string) => {
    if (path === "/api/wishlist") return { products };
    return {};
  });
}

function renderPage(overrides: Partial<Parameters<typeof WishlistPage>[0]> = {}) {
  const props = {
    authStatus: "authenticated" as const,
    navigate: vi.fn(),
    onAdd: vi.fn().mockResolvedValue(undefined),
    refreshCart: vi.fn().mockResolvedValue(undefined),
    refreshWishlist: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };

  const view = render(<WishlistPage {...props} />);
  return { ...props, ...view };
}

describe("WishlistPage", () => {
  beforeEach(() => {
    mockedApi.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading state while auth is checking", () => {
    renderPage({ authStatus: "checking" });

    expect(screen.getByText(/Loading wishlist/i)).toBeDefined();
    expect(mockedApi).not.toHaveBeenCalled();
  });

  it("renders guest state with a sign in prompt", async () => {
    const navigate = vi.fn();
    renderPage({ authStatus: "guest", navigate });

    expect(screen.getByText(/Sign in to view your wishlist/i)).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: /Sign In or Register/i }));

    expect(navigate).toHaveBeenCalledWith("/account");
    expect(mockedApi).not.toHaveBeenCalled();
  });

  it("shows loading state while wishlist products are loading", () => {
    mockedApi.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/Loading wishlist/i)).toBeDefined();
  });

  it("renders an error state and retries loading", async () => {
    mockedApi
      .mockRejectedValueOnce(new Error("Wishlist unavailable"))
      .mockResolvedValueOnce({ products: [] });

    renderPage();

    expect(await screen.findByText(/We could not load your wishlist/i)).toBeDefined();
    expect(screen.getByText(/Wishlist unavailable/i)).toBeDefined();

    await userEvent.click(screen.getByRole("button", { name: /Try Again/i }));

    await waitFor(() => expect(mockedApi).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Your wishlist is empty/i)).toBeDefined();
  });

  it("renders an empty wishlist state", async () => {
    const navigate = vi.fn();
    mockWishlist([]);
    renderPage({ navigate });

    expect(await screen.findByText(/Your wishlist is empty/i)).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: /Return To Shop/i }));

    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("renders wishlist products", async () => {
    mockWishlist([product, secondProduct]);
    renderPage();

    expect(await screen.findByText("Wishlist Product")).toBeDefined();
    expect(screen.getByText("Second Wishlist Product")).toBeDefined();
    expect(screen.getByText("Wishlist (2)")).toBeDefined();
  });

  it("removes an item from the wishlist", async () => {
    const refreshWishlist = vi.fn().mockResolvedValue(undefined);
    mockWishlist([product]);
    renderPage({ refreshWishlist });

    await screen.findByText("Wishlist Product");
    await userEvent.click(screen.getByRole("button", { name: /Remove Wishlist Product/i }));

    await waitFor(() => expect(mockedApi).toHaveBeenCalledWith("/api/wishlist/p1", { method: "DELETE" }));
    await waitFor(() => expect(refreshWishlist).toHaveBeenCalled());
    expect(screen.getByText(/Your wishlist is empty/i)).toBeDefined();
  });

  it("moves an item to the cart using the first in-stock detail variant, then removes it from the wishlist", async () => {
    const refreshCart = vi.fn().mockResolvedValue(undefined);
    const refreshWishlist = vi.fn().mockResolvedValue(undefined);
    const productWithOptions = { ...product, colors: ["red", "blue"], sizes: ["S", "M"] };
    mockedApi.mockImplementation(async (path: string) => {
      if (path === "/api/wishlist") return { products: [productWithOptions] };
      if (path === "/api/products/p1") {
        return {
          product: productWithOptions,
          related: [],
          variants: [
            { id: "v-red-s", productId: "p1", sku: "RED-S", color: "red", size: "S", stock: 0 },
            { id: "v-blue-m", productId: "p1", sku: "BLUE-M", color: "blue", size: "M", stock: 4 }
          ]
        };
      }
      return {};
    });
    renderPage({ refreshCart, refreshWishlist });

    await screen.findByText("Wishlist Product");
    await userEvent.click(screen.getByRole("button", { name: /Move to cart/i }));

    await waitFor(() => {
      expect(mockedApi).toHaveBeenCalledWith("/api/products/p1");
      expect(mockedApi).toHaveBeenCalledWith("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId: "p1", quantity: 1, selectedColor: "blue", selectedSize: "M" })
      });
      expect(mockedApi).toHaveBeenCalledWith("/api/wishlist/p1", { method: "DELETE" });
    });

    const cartAddCall = mockedApi.mock.calls.findIndex(([path]) => path === "/api/cart/items");
    const wishlistDeleteCall = mockedApi.mock.calls.findIndex(([path]) => path === "/api/wishlist/p1");
    expect(cartAddCall).toBeGreaterThan(-1);
    expect(wishlistDeleteCall).toBeGreaterThan(cartAddCall);
    expect(refreshCart).toHaveBeenCalled();
    expect(refreshWishlist).toHaveBeenCalled();
    expect(screen.getByText(/Your wishlist is empty/i)).toBeDefined();
  });

  it("moves an item without variants directly to the cart", async () => {
    mockWishlist([productWithoutOptions]);
    renderPage();

    await screen.findByText("Wishlist Product");
    await userEvent.click(screen.getByRole("button", { name: /Move to cart/i }));

    await waitFor(() => {
      expect(mockedApi).toHaveBeenCalledWith("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({ productId: "p1", quantity: 1, selectedColor: "", selectedSize: "" })
      });
    });
    expect(mockedApi).not.toHaveBeenCalledWith("/api/products/p1");
  });

  it("routes to product detail with feedback when no in-stock variant can be found", async () => {
    const navigate = vi.fn();
    mockedApi.mockImplementation(async (path: string) => {
      if (path === "/api/wishlist") return { products: [product] };
      if (path === "/api/products/p1") {
        return {
          product,
          related: [],
          variants: [{ id: "v-red-s", productId: "p1", sku: "RED-S", color: "red", size: "S", stock: 0 }]
        };
      }
      return {};
    });
    renderPage({ navigate });

    await screen.findByText("Wishlist Product");
    await userEvent.click(screen.getByRole("button", { name: /Move to cart/i }));

    expect(await screen.findByText(/Choose available options for Wishlist Product before moving it to cart/i)).toBeDefined();
    expect(navigate).toHaveBeenCalledWith("/product/p1");
    expect(mockedApi).not.toHaveBeenCalledWith("/api/cart/items", expect.anything());
    expect(mockedApi).not.toHaveBeenCalledWith("/api/wishlist/p1", { method: "DELETE" });
  });

  it("keeps out-of-stock items from moving to the cart", async () => {
    mockWishlist([{ ...product, stockStatus: "Out of Stock" }]);
    renderPage();

    await screen.findByText("Wishlist Product");
    const moveButton = screen.getAllByRole("button", { name: /Out of stock/i }).find((button) => button.className.includes("button--primary"));

    expect(moveButton).toBeDefined();
    expect((moveButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows an action error when moving to cart fails", async () => {
    mockedApi.mockImplementation(async (path: string) => {
      if (path === "/api/wishlist") return { products: [productWithoutOptions] };
      if (path === "/api/cart/items") throw new Error("Only 0 Wishlist Product items are available");
      return {};
    });
    renderPage();

    await screen.findByText("Wishlist Product");
    await userEvent.click(screen.getByRole("button", { name: /Move to cart/i }));

    expect(await screen.findByText(/Only 0 Wishlist Product items are available/i)).toBeDefined();
    expect(screen.getByText("Wishlist Product")).toBeDefined();
    expect(mockedApi).not.toHaveBeenCalledWith("/api/wishlist/p1", { method: "DELETE" });
  });

  it("shows an action error and reloads when remove fails", async () => {
    mockedApi.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path === "/api/wishlist" && !options?.method) return { products: [product] };
      if (path === "/api/wishlist/p1") throw new Error("Remove failed");
      return {};
    });
    renderPage();

    await screen.findByText("Wishlist Product");
    await userEvent.click(screen.getByRole("button", { name: /Remove Wishlist Product/i }));

    expect(await screen.findByText(/Remove failed/i)).toBeDefined();
    expect(screen.getByText("Wishlist Product")).toBeDefined();
  });
});
