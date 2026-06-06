/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderPage } from "./OrderPage";
import type { Order } from "../types";

const apiMocks = vi.hoisted(() => ({
  getOrderDetail: vi.fn(),
}));

vi.mock("../api/ecommerceApi", () => ({
  useGetOrderDetailQuery: (id: string, options?: { skip?: boolean }) => {
    if (options?.skip) {
      return {
        data: undefined,
        error: undefined,
        isLoading: false,
        refetch: vi.fn(),
      };
    }
    return apiMocks.getOrderDetail(id);
  },
}));

const baseOrder: Order = {
  id: "order-1",
  userId: "user-1",
  items: [
    {
      id: "item-1",
      productId: "p1",
      quantity: 2,
      selectedColor: "Black",
      selectedSize: "M",
      name: "Classic Tee",
      price: 2500,
    },
    {
      id: "item-2",
      productId: "p2",
      quantity: 1,
      selectedColor: "",
      selectedSize: "",
      name: "Canvas Tote",
      price: 1500,
    },
  ],
  billing: {
    firstName: "Jane",
    lastName: "Doe",
    streetAddress: "123 Maple Drive",
    apartment: "Apt 4",
    townCity: "Townsville",
    phone: "555-0123",
    email: "jane@example.com",
  },
  paymentMethod: "bank",
  subtotal: 6500,
  discount: 500,
  shipping: 0,
  total: 6000,
  status: "shipped",
  createdAt: "2026-04-10T12:00:00.000Z",
};

function renderPage(overrides: Partial<Parameters<typeof OrderPage>[0]> = {}) {
  const props = {
    authStatus: "authenticated" as const,
    id: "order-1",
    navigate: vi.fn(),
    ...overrides,
  };

  const view = render(<OrderPage {...props} />);
  return { ...props, ...view };
}

describe("OrderPage", () => {
  beforeEach(() => {
    apiMocks.getOrderDetail.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows guest state", async () => {
    const navigate = vi.fn();
    apiMocks.getOrderDetail.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    renderPage({ authStatus: "guest", navigate });

    expect(screen.getByText(/Sign in to view this order/i)).toBeDefined();
    await userEvent.click(
      screen.getByRole("button", { name: /Sign In or Register/i }),
    );
    expect(navigate).toHaveBeenCalledWith("/account");
  });

  it("shows loading state", () => {
    apiMocks.getOrderDetail.mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: true,
      refetch: vi.fn(),
    });
    renderPage();

    expect(screen.getByText(/Loading order/i)).toBeDefined();
  });

  it("shows a request error state", async () => {
    const refetch = vi.fn();
    apiMocks.getOrderDetail.mockReturnValue({
      data: undefined,
      error: { data: { message: "Order service unavailable" } },
      isLoading: false,
      refetch,
    });
    renderPage();

    expect(
      await screen.findByText(/We could not load this order/i),
    ).toBeDefined();
    expect(screen.getByText(/Order service unavailable/i)).toBeDefined();
    
    await userEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("shows not-found state", async () => {
    apiMocks.getOrderDetail.mockReturnValue({
      data: undefined,
      error: { status: 404, data: { message: "Missing order" } },
      isLoading: false,
      refetch: vi.fn(),
    });
    renderPage();

    expect(await screen.findByText(/Order not found/i)).toBeDefined();
    expect(
      screen.getByText(/We could not find that order for your account/i),
    ).toBeDefined();
  });

  it("renders order items, billing, and totals", async () => {
    apiMocks.getOrderDetail.mockReturnValue({
      data: { order: baseOrder },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    renderPage();

    expect(await screen.findByText(/Thanks for your purchase/i)).toBeDefined();
    expect(screen.getAllByText("order-1").length).toBeGreaterThan(0);
    expect(screen.getByText("Classic Tee")).toBeDefined();
    expect(screen.getByText("Qty 2 | Black | Size M")).toBeDefined();
    expect(screen.getByText("Canvas Tote")).toBeDefined();
    expect(screen.getAllByText("$5000").length).toBeGreaterThan(0);
    expect(screen.getByText("Subtotal:")).toBeDefined();
    expect(screen.getByText("$6500")).toBeDefined();
    expect(screen.getByText("Discount:")).toBeDefined();
    expect(screen.getByText("$500")).toBeDefined();
    expect(screen.getByText("Total:")).toBeDefined();
    expect(screen.getAllByText("$6000").length).toBeGreaterThan(0);
    expect(screen.getByText(/123 Maple Drive/i)).toBeDefined();
    expect(screen.getByText(/Apt 4/i)).toBeDefined();
    expect(screen.getByText(/jane@example.com/i)).toBeDefined();
  });

  it("shows payment received only for shipped orders", async () => {
    apiMocks.getOrderDetail.mockReturnValueOnce({
      data: { order: baseOrder },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    const { rerender } = renderPage();

    expect(await screen.findByText(/Payment received/i)).toBeDefined();

    apiMocks.getOrderDetail.mockReturnValueOnce({
      data: { order: { ...baseOrder, status: "pending" } },
      error: undefined,
      isLoading: false,
      refetch: vi.fn(),
    });
    rerender(
      <OrderPage authStatus="authenticated" id="order-2" navigate={vi.fn()} />,
    );

    await screen.findByText(/currently Pending/i);
    expect(screen.queryByText(/Payment received/i)).toBeNull();
  });
});
