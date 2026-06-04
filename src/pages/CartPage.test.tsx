/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, beforeEach, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartPage } from "./CartPage";
import type { Cart } from "../types";

vi.mock("../api/client", () => ({ api: vi.fn() }));
import { api } from "../api/client";

const mockedApi = vi.mocked(api);

const baseCart: Cart = {
  items: [
    {
      id: "item-1",
      productId: "p1",
      quantity: 2,
      selectedColor: "red",
      selectedSize: "S",
      product: {
        id: "p1",
        name: "Test Product",
        category: "test",
        description: "A product description",
        price: 1999,
        originalPrice: 0,
        discountPercent: 0,
        rating: 4,
        reviewCount: 10,
        stockStatus: "In Stock",
        colors: ["red"],
        sizes: ["S"],
        isNew: false,
        flags: [],
        image: "default"
      },
      lineTotal: 3998
    }
  ],
  subtotal: 3998,
  discount: 0,
  shipping: 500,
  total: 4498
};

describe("CartPage", () => {
  beforeEach(() => {
    mockedApi.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows loading state while checking cart", () => {
    render(
      <CartPage
        authStatus="checking"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={vi.fn()}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );
    expect(screen.getByText(/Loading cart/i)).toBeDefined();
  });

  it("shows loading state while cart is loading", () => {
    render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={true}
        cartError=""
        navigate={vi.fn()}
        refreshCart={vi.fn()}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );
    expect(screen.getByText(/Loading cart/i)).toBeDefined();
  });

  it("renders guest state with sign in prompt", async () => {
    const navigate = vi.fn();
    render(
      <CartPage
        authStatus="guest"
        cart={{ ...baseCart, items: [] }}
        cartLoading={false}
        cartError=""
        navigate={navigate}
        refreshCart={vi.fn()}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Sign in to view your cart/i)).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: /Sign In or Register/i }));
    expect(navigate).toHaveBeenCalledWith("/account");
  });

  it("renders error state when cartError is present", async () => {
    const refreshCart = vi.fn();
    render(
      <CartPage
        authStatus="authenticated"
        cart={{ ...baseCart, items: [] }}
        cartLoading={false}
        cartError="Server error"
        navigate={vi.fn()}
        refreshCart={refreshCart}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    expect(screen.getByText(/We could not load your cart/i)).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(refreshCart).toHaveBeenCalled();
  });

  it("renders an empty cart state when the cart has no items", async () => {
    const navigate = vi.fn();
    render(
      <CartPage
        authStatus="authenticated"
        cart={{ ...baseCart, items: [] }}
        cartLoading={false}
        cartError=""
        navigate={navigate}
        refreshCart={vi.fn()}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Your cart is empty/i)).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: /Return To Shop/i }));
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("renders cart items and updates quantity via API", async () => {
    const refreshCart = vi.fn();
    mockedApi.mockResolvedValue({});

    const { container } = render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={refreshCart}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    expect(screen.getByText("Test Product")).toBeDefined();
    expect(screen.getByText("$1999")).toBeDefined();
    expect(screen.getByRole("button", { name: /Apply Coupon/i })).toBeDefined();

    const row = screen.getByText("Test Product").closest(".cart-row") as HTMLElement | null;
    expect(within(row!).getByText("$3998")).toBeDefined();
    const plusButton = row?.querySelectorAll(".quantity button")[1];
    await userEvent.click(plusButton!);

    await waitFor(() => expect(mockedApi).toHaveBeenCalledWith("/api/cart/items/item-1", {
      method: "PATCH",
      body: JSON.stringify({ quantity: 3 })
    }));
    expect(refreshCart).toHaveBeenCalledWith("");

    const couponInput = screen.getByPlaceholderText("Coupon Code");
    await userEvent.type(couponInput, " save10 ");
    await userEvent.click(screen.getByRole("button", { name: /Apply Coupon/i }));

    await waitFor(() => expect(refreshCart).toHaveBeenCalledWith("SAVE10"));
  });

  it("shows an action error when quantity update fails", async () => {
    const refreshCart = vi.fn();
    mockedApi.mockRejectedValue(new Error("Update failed"));

    const row = render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={refreshCart}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    const plusButton = row.container.querySelectorAll(".quantity button")[1];
    await userEvent.click(plusButton!);

    await waitFor(() => expect(screen.getByText(/Update failed/i)).toBeDefined());
    expect(refreshCart).not.toHaveBeenCalled();
  });

  it("shows stock errors when quantity exceeds availability", async () => {
    const refreshCart = vi.fn();
    mockedApi.mockRejectedValue(new Error("Only 2 Test Product items are available"));

    const row = render(
      <CartPage
        authStatus="authenticated"
        cart={baseCart}
        cartLoading={false}
        cartError=""
        navigate={vi.fn()}
        refreshCart={refreshCart}
        appliedCoupon=""
        onAppliedCouponChange={vi.fn()}
      />
    );

    const plusButton = row.container.querySelectorAll(".quantity button")[1];
    await userEvent.click(plusButton!);

    await waitFor(() => expect(screen.getByText(/Only 2 Test Product items are available/i)).toBeDefined());
    expect(refreshCart).not.toHaveBeenCalled();
  });
});
