/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, beforeEach, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckoutPage } from "./CheckoutPage";
import type { Cart } from "../types";

vi.mock("../api/client", () => ({ api: vi.fn() }));
import { api } from "../api/client";

const mockedApi = vi.mocked(api);

const cart: Cart = {
  items: [
    {
      id: "item-1",
      productId: "p1",
      quantity: 1,
      selectedColor: "red",
      selectedSize: "M",
      product: {
        id: "p1",
        name: "Checkout Product",
        category: "test",
        description: "Checkout product description.",
        price: 2999,
        originalPrice: 0,
        discountPercent: 0,
        rating: 5,
        reviewCount: 5,
        stockStatus: "In Stock",
        colors: ["red"],
        sizes: ["M"],
        isNew: false,
        flags: [],
        image: "default",
      },
      lineTotal: 2999,
    },
  ],
  subtotal: 2999,
  discount: 0,
  shipping: 500,
  total: 3499,
};

describe("CheckoutPage", () => {
  beforeEach(() => {
    mockedApi.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    delete window.Stripe;
  });

  it("shows loading state while checking out", () => {
    render(
      <CheckoutPage
        authStatus="checking"
        cart={cart}
        cartLoading={false}
        cartError=""
        refreshCart={vi.fn()}
        navigate={vi.fn()}
        appliedCoupon=""
        onCouponConsumed={vi.fn()}
      />,
    );

    expect(screen.getByText(/Loading checkout/i)).toBeDefined();
  });

  it("shows guest state and sign in prompt", async () => {
    const navigate = vi.fn();
    render(
      <CheckoutPage
        authStatus="guest"
        cart={cart}
        cartLoading={false}
        cartError=""
        refreshCart={vi.fn()}
        navigate={navigate}
        appliedCoupon=""
        onCouponConsumed={vi.fn()}
      />,
    );

    expect(screen.getByText(/Sign in to checkout/i)).toBeDefined();
    await userEvent.click(
      screen.getByRole("button", { name: /Sign In or Register/i }),
    );
    expect(navigate).toHaveBeenCalledWith("/account");
  });

  it("shows an error state when cartError exists", async () => {
    const refreshCart = vi.fn();
    render(
      <CheckoutPage
        authStatus="authenticated"
        cart={cart}
        cartLoading={false}
        cartError="Checkout unavailable"
        refreshCart={refreshCart}
        navigate={vi.fn()}
        appliedCoupon=""
        onCouponConsumed={vi.fn()}
      />,
    );

    expect(screen.getByText(/Checkout is not available yet/i)).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(refreshCart).toHaveBeenCalled();
  });

  it("shows empty cart state when there are no items", async () => {
    const navigate = vi.fn();
    render(
      <CheckoutPage
        authStatus="authenticated"
        cart={{ ...cart, items: [] }}
        cartLoading={false}
        cartError=""
        refreshCart={vi.fn()}
        navigate={navigate}
        appliedCoupon=""
        onCouponConsumed={vi.fn()}
      />,
    );

    expect(screen.getByText(/Your cart is empty/i)).toBeDefined();
    await userEvent.click(
      screen.getByRole("button", { name: /Return To Shop/i }),
    );
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("submits the checkout form and navigates to the order page", async () => {
    const refreshCart = vi.fn();
    const navigate = vi.fn();
    const onCouponConsumed = vi.fn();
    mockedApi
      .mockResolvedValueOnce({ order: { id: "order-1" } })
      .mockResolvedValueOnce({
        payment: { id: "pay-1", status: "succeeded" },
        order: { id: "order-1", status: "shipped" },
      });

    render(
      <CheckoutPage
        authStatus="authenticated"
        cart={cart}
        cartLoading={false}
        cartError=""
        refreshCart={refreshCart}
        navigate={navigate}
        appliedCoupon="SAVE10"
        onCouponConsumed={onCouponConsumed}
      />,
    );

    await userEvent.type(screen.getByLabelText(/first Name/i), "Jane");
    await userEvent.type(
      screen.getByLabelText(/street Address/i),
      "123 Maple Drive",
    );
    await userEvent.type(screen.getByLabelText(/town City/i), "Townsville");
    await userEvent.type(screen.getByLabelText(/phone/i), "555-0123");
    await userEvent.type(screen.getByLabelText(/email/i), "jane@example.com");

    await userEvent.click(screen.getByRole("button", { name: /Place Order/i }));

    await waitFor(() => expect(mockedApi).toHaveBeenCalled());
    const [path, options] = mockedApi.mock.calls[0];
    expect(path).toBe("/api/orders");
    expect(options?.method).toBe("POST");
    expect(JSON.parse(options?.body as string)).toMatchObject({
      billing: expect.any(Object),
      paymentMethod: "stripe",
      couponCode: "SAVE10",
    });
    expect(mockedApi).toHaveBeenNthCalledWith(2, "/api/payments", {
      method: "POST",
      body: JSON.stringify({
        orderId: "order-1",
        paymentMethod: "stripe",
      }),
    });

    expect(refreshCart).toHaveBeenCalled();
    expect(onCouponConsumed).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/orders/order-1");
  });

  it("confirms Stripe payments in the browser before navigating", async () => {
    vi.stubEnv("VITE_STRIPE_PUBLISHABLE_KEY", "pk_test_123");
    const refreshCart = vi.fn();
    const navigate = vi.fn();
    const onCouponConsumed = vi.fn();
    const mount = vi.fn();
    const unmount = vi.fn();
    const confirmPayment = vi.fn().mockResolvedValue({
      paymentIntent: { status: "succeeded" },
    });
    const elements = {
      create: vi.fn(() => ({ mount, unmount })),
    };
    window.Stripe = vi.fn(() => ({
      elements: vi.fn(() => elements),
      confirmPayment,
    }));
    mockedApi
      .mockResolvedValueOnce({ order: { id: "order-1" } })
      .mockResolvedValueOnce({
        payment: {
          id: "pi_1",
          status: "requires_payment_method",
          provider: "stripe",
          clientSecret: "pi_1_secret_test",
        },
        order: { id: "order-1", status: "processing" },
      });

    render(
      <CheckoutPage
        authStatus="authenticated"
        cart={cart}
        cartLoading={false}
        cartError=""
        refreshCart={refreshCart}
        navigate={navigate}
        appliedCoupon=""
        onCouponConsumed={onCouponConsumed}
      />,
    );

    await userEvent.type(screen.getByLabelText(/first Name/i), "Jane");
    await userEvent.type(
      screen.getByLabelText(/street Address/i),
      "123 Maple Drive",
    );
    await userEvent.type(screen.getByLabelText(/town City/i), "Townsville");
    await userEvent.type(screen.getByLabelText(/phone/i), "555-0123");
    await userEvent.type(screen.getByLabelText(/email/i), "jane@example.com");
    await userEvent.click(screen.getByRole("button", { name: /Place Order/i }));

    expect(navigate).not.toHaveBeenCalled();
    await waitFor(() => expect(mount).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: /Pay Now/i }));

    await waitFor(() =>
      expect(confirmPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          elements,
          redirect: "if_required",
        }),
      ),
    );
    expect(refreshCart).toHaveBeenCalled();
    expect(onCouponConsumed).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/orders/order-1");
  });

  it("stays on checkout and shows an error when payment fails", async () => {
    const refreshCart = vi.fn();
    const navigate = vi.fn();
    const onCouponConsumed = vi.fn();
    mockedApi
      .mockResolvedValueOnce({ order: { id: "order-1" } })
      .mockRejectedValueOnce(new Error("Payment failed"));

    render(
      <CheckoutPage
        authStatus="authenticated"
        cart={cart}
        cartLoading={false}
        cartError=""
        refreshCart={refreshCart}
        navigate={navigate}
        appliedCoupon="SAVE10"
        onCouponConsumed={onCouponConsumed}
      />,
    );

    await userEvent.type(screen.getByLabelText(/first Name/i), "Jane");
    await userEvent.type(
      screen.getByLabelText(/street Address/i),
      "123 Maple Drive",
    );
    await userEvent.type(screen.getByLabelText(/town City/i), "Townsville");
    await userEvent.type(screen.getByLabelText(/phone/i), "555-0123");
    await userEvent.type(screen.getByLabelText(/email/i), "jane@example.com");

    await userEvent.click(screen.getByRole("button", { name: /Place Order/i }));

    await waitFor(() =>
      expect(screen.getByText(/Payment failed/i)).toBeDefined(),
    );
    expect(refreshCart).toHaveBeenCalled();
    expect(onCouponConsumed).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("shows an error status when checkout submission fails", async () => {
    mockedApi.mockRejectedValue(new Error("Checkout failed"));

    render(
      <CheckoutPage
        authStatus="authenticated"
        cart={cart}
        cartLoading={false}
        cartError=""
        refreshCart={vi.fn()}
        navigate={vi.fn()}
        appliedCoupon=""
        onCouponConsumed={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText(/first Name/i), "Jane");
    await userEvent.type(
      screen.getByLabelText(/street Address/i),
      "123 Maple Drive",
    );
    await userEvent.type(screen.getByLabelText(/town City/i), "Townsville");
    await userEvent.type(screen.getByLabelText(/phone/i), "555-0123");
    await userEvent.type(screen.getByLabelText(/email/i), "jane@example.com");

    await userEvent.click(screen.getByRole("button", { name: /Place Order/i }));

    await waitFor(() =>
      expect(screen.getByText(/Checkout failed/i)).toBeDefined(),
    );
  });

  it("shows stock errors when inventory changes before purchase", async () => {
    mockedApi.mockRejectedValue(new Error("Only 0 Checkout Product items are available"));

    render(
      <CheckoutPage
        authStatus="authenticated"
        cart={cart}
        cartLoading={false}
        cartError=""
        refreshCart={vi.fn()}
        navigate={vi.fn()}
        appliedCoupon=""
        onCouponConsumed={vi.fn()}
      />,
    );

    await userEvent.type(screen.getByLabelText(/first Name/i), "Jane");
    await userEvent.type(
      screen.getByLabelText(/street Address/i),
      "123 Maple Drive",
    );
    await userEvent.type(screen.getByLabelText(/town City/i), "Townsville");
    await userEvent.type(screen.getByLabelText(/phone/i), "555-0123");
    await userEvent.type(screen.getByLabelText(/email/i), "jane@example.com");

    await userEvent.click(screen.getByRole("button", { name: /Place Order/i }));

    await waitFor(() =>
      expect(screen.getByText(/Only 0 Checkout Product items are available/i)).toBeDefined(),
    );
  });
});
