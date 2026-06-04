/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductCard } from "./ProductCard";
import type { Product } from "../types";

const product: Product = {
  id: "p1",
  name: "Test Product",
  category: "test",
  description: "A great product.",
  price: 1999,
  originalPrice: 2499,
  discountPercent: 20,
  rating: 4,
  reviewCount: 12,
  stockStatus: "In Stock",
  colors: ["red"],
  sizes: ["S"],
  isNew: true,
  flags: ["bestseller"],
  image: "default"
};

describe("ProductCard", () => {
  it("renders the product details and actions", () => {
    render(
      <ProductCard
        product={product}
        onAdd={vi.fn()}
        onWishlist={vi.fn()}
        navigate={vi.fn()}
      />
    );

    expect(screen.getByText("Test Product")).toBeDefined();
    expect(screen.getByText("$1999")).toBeDefined();
    expect(screen.getByText("$2499")).toBeDefined();
    expect(screen.getByText(/-20%/)).toBeDefined();
    expect(screen.getByText("NEW")).toBeDefined();
    expect(screen.getByText("(12)")).toBeDefined();
    expect(screen.getByRole("button", { name: /Add To Cart/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /View Test Product/i })).toBeDefined();
  });

  it("calls handlers for add, wishlist, and navigation", async () => {
    const onAdd = vi.fn();
    const onWishlist = vi.fn();
    const navigate = vi.fn();

    const { container } = render(
      <ProductCard product={product} onAdd={onAdd} onWishlist={onWishlist} navigate={navigate} />
    );

    const user = userEvent.setup();
    const wishlistButton = container.querySelector<HTMLButtonElement>('button[aria-label="Wishlist Test Product"]');
    const viewButton = container.querySelector<HTMLButtonElement>('button[aria-label="View Test Product"]');
    const addToCartButton = container.querySelector<HTMLButtonElement>("button.add-cart");
    const titleButton = container.querySelector<HTMLButtonElement>("button.product-card__title");

    await user.click(wishlistButton!);
    await user.click(viewButton!);
    await user.click(addToCartButton!);
    await user.click(titleButton!);

    expect(onWishlist).toHaveBeenCalledWith("p1");
    expect(navigate).toHaveBeenCalledWith("/product/p1");
    expect(onAdd).toHaveBeenCalledWith("p1");
  });

  it("disables the add to cart button when out of stock", () => {
    render(
      <ProductCard
        product={{ ...product, stockStatus: "Out of Stock", isNew: false }}
        onAdd={vi.fn()}
        onWishlist={vi.fn()}
        navigate={vi.fn()}
      />
    );

    const outOfStockButton = screen.getByRole("button", { name: /Out of stock/i }) as HTMLButtonElement;
    expect(outOfStockButton.disabled).toBe(true);
    expect(screen.getByText("OUT OF STOCK")).toBeDefined();
  });

  it("renders a secondary action and optionally hides the wishlist button", () => {
    const { container } = render(
      <ProductCard
        product={product}
        onAdd={vi.fn()}
        onWishlist={vi.fn()}
        navigate={vi.fn()}
        showWishlistButton={false}
        secondaryAction={<button>Secondary</button>}
      />
    );

    const wishlistButton = container.querySelector<HTMLButtonElement>('button[aria-label="Wishlist Test Product"]');
    expect(wishlistButton).toBeNull();
    expect(screen.getByText("Secondary")).toBeDefined();
  });
});
