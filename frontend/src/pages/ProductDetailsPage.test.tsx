/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductDetailsPage } from "./ProductDetailsPage";
import type { Product, ProductDetailResponse } from "../types";

vi.mock("../api/client", () => ({ api: vi.fn() }));
import { api } from "../api/client";

const mockedApi = vi.mocked(api);

const product: Product = {
  id: "p1",
  name: "Detail Product",
  category: "electronics",
  description: "A detailed product description.",
  price: 1999,
  originalPrice: 2499,
  discountPercent: 20,
  rating: 4,
  reviewCount: 12,
  stockStatus: "In Stock",
  colors: ["red", "blue"],
  sizes: ["S", "M"],
  isNew: true,
  flags: ["best"],
  image: "default"
};

const relatedProduct: Product = {
  ...product,
  id: "p2",
  name: "Related Product",
  colors: [],
  sizes: [],
  image: "gamepad-red"
};

const response: ProductDetailResponse = {
  product,
  related: [relatedProduct]
};

function renderPage(overrides: Partial<Parameters<typeof ProductDetailsPage>[0]> = {}) {
  const props = {
    id: "p1",
    navigate: vi.fn(),
    onAdd: vi.fn().mockResolvedValue(undefined),
    onWishlist: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };

  const view = render(<ProductDetailsPage {...props} />);
  return { ...props, ...view };
}

describe("ProductDetailsPage", () => {
  beforeEach(() => {
    mockedApi.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading state while product details are loading", () => {
    mockedApi.mockReturnValue(new Promise(() => {}));
    renderPage();

    expect(screen.getByText(/Loading product/i)).toBeDefined();
  });

  it("shows an error state and lets shoppers return to the shop", async () => {
    const navigate = vi.fn();
    mockedApi.mockRejectedValue(new Error("Product unavailable"));
    renderPage({ navigate });

    expect(await screen.findByText(/We could not load this product/i)).toBeDefined();
    expect(screen.getByText(/Product unavailable/i)).toBeDefined();

    await userEvent.click(screen.getByRole("button", { name: /Return To Shop/i }));
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("shows product details and related products", async () => {
    mockedApi.mockResolvedValue(response);
    renderPage();

    expect(await screen.findByRole("heading", { name: "Detail Product" })).toBeDefined();
    expect(screen.getAllByText("$1999").length).toBeGreaterThan(0);
    expect(screen.getByText("A detailed product description.")).toBeDefined();
    expect(screen.getByText("(12 Reviews)")).toBeDefined();
    expect(screen.getByText("In Stock")).toBeDefined();
    expect(screen.getByText("Related Product")).toBeDefined();
  });

  it("requires color and size selections before adding to cart", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    mockedApi.mockResolvedValue(response);
    renderPage({ onAdd });

    const buyButton = await screen.findByRole("button", { name: /Buy Now/i }) as HTMLButtonElement;
    expect(buyButton.disabled).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: /Color red/i }));
    expect(buyButton.disabled).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: "M" }));
    expect(buyButton.disabled).toBe(false);

    await userEvent.click(buyButton);
    expect(onAdd).toHaveBeenCalledWith("p1", 1, "red", "M");
  });

  it("passes the selected quantity to add to cart", async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    mockedApi.mockResolvedValue(response);
    const { container } = renderPage({ onAdd });

    await screen.findByRole("heading", { name: "Detail Product" });
    await userEvent.click(screen.getByRole("button", { name: /Color blue/i }));
    await userEvent.click(screen.getByRole("button", { name: "S" }));

    const quantityButtons = container.querySelectorAll<HTMLButtonElement>(".quantity button");
    await userEvent.click(quantityButtons[1]);
    await userEvent.click(quantityButtons[1]);
    await userEvent.click(screen.getByRole("button", { name: /Buy Now/i }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledWith("p1", 3, "blue", "S"));
  });

  it("disables the buy action when the product is out of stock", async () => {
    mockedApi.mockResolvedValue({
      product: { ...product, stockStatus: "Out of Stock" },
      related: []
    });
    renderPage();

    const outOfStockButton = await screen.findByRole("button", { name: /Out of stock/i }) as HTMLButtonElement;
    expect(outOfStockButton.disabled).toBe(true);
    expect(screen.getAllByText("Out of stock").length).toBeGreaterThan(0);
  });

  it("adds the product to the wishlist", async () => {
    const onWishlist = vi.fn().mockResolvedValue(undefined);
    mockedApi.mockResolvedValue(response);
    renderPage({ onWishlist });

    await screen.findByRole("heading", { name: "Detail Product" });
    await userEvent.click(screen.getByRole("button", { name: /Add to wishlist/i }));

    expect(onWishlist).toHaveBeenCalledWith("p1");
  });
});
