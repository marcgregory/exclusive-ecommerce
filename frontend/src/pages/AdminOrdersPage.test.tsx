/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { AdminOrdersPage } from "./AdminOrdersPage";
import { store } from "../app/store";
import * as ecommerceApiModule from "../api/ecommerceApi";
import type { AdminOrder, PublicUser } from "../types";

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

const stripeOrder: AdminOrder = {
  id: "order-stripe-1",
  userId: "user-1",
  customerEmail: "buyer@example.com",
  customerName: "Buyer Example",
  items: [
    {
      id: "item-1",
      productId: "p1",
      quantity: 1,
      selectedColor: "Black",
      selectedSize: "M",
      name: "Classic Tee",
      price: 2500,
    },
  ],
  billing: {
    firstName: "Buyer",
    lastName: "Example",
    streetAddress: "123 Maple Drive",
    townCity: "Townsville",
    phone: "555-0123",
    email: "buyer@example.com",
  },
  paymentMethod: "stripe",
  subtotal: 2500,
  discount: 0,
  shipping: 500,
  total: 3000,
  status: "processing",
  internalNote: "",
  createdAt: "2026-04-10T12:00:00.000Z",
};

function renderPage(user: PublicUser | null = admin) {
  const props = {
    userState: { data: user, loading: false, error: "" },
    navigate: vi.fn(),
  };

  const view = render(
    <Provider store={store}>
      <AdminOrdersPage {...props} />
    </Provider>,
  );
  return { ...props, ...view };
}

describe("AdminOrdersPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("requires an admin user", () => {
    renderPage(customer);

    expect(screen.getByText(/Admin access required/i)).toBeDefined();
  });

  it("loads admin orders and highlights Stripe orders that need review", async () => {
    vi.spyOn(ecommerceApiModule, "useGetAdminOrdersQuery").mockReturnValue({
      data: {
        orders: [stripeOrder],
        total: 1,
        page: 1,
        limit: 50,
      },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    } as any);

    renderPage();

    expect(await screen.findByText("order-stripe-1")).toBeDefined();
    expect(screen.getByText(/buyer@example.com/i)).toBeDefined();
    expect(screen.getByText(/Stripe review/i)).toBeDefined();
    expect(screen.getByText("Needs review")).toBeDefined();
  });

  it("filters orders by status and customer email", async () => {
    const actor = userEvent.setup();
    const mockRefetch = vi.fn();

    vi.spyOn(ecommerceApiModule, "useGetAdminOrdersQuery").mockReturnValue({
      data: {
        orders: [],
        total: 0,
        page: 1,
        limit: 50,
      },
      isLoading: false,
      error: undefined,
      refetch: mockRefetch,
    } as any);

    renderPage();

    await actor.selectOptions(screen.getByLabelText(/Status/i), "cancelled");
    await actor.type(screen.getByLabelText(/Customer email/i), "buyer@example.com");
    await actor.click(screen.getByRole("button", { name: /Search/i }));

    // After status/email changes, the query should be called with new filters
    // The component will re-render and pass new filter params to the query
    await waitFor(() => {
      const calls = (ecommerceApiModule.useGetAdminOrdersQuery as any).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toMatchObject({
        status: "cancelled",
        email: "buyer@example.com",
      });
    });
  });

  it("navigates to admin order details", async () => {
    const actor = userEvent.setup();
    vi.spyOn(ecommerceApiModule, "useGetAdminOrdersQuery").mockReturnValue({
      data: {
        orders: [stripeOrder],
        total: 1,
        page: 1,
        limit: 50,
      },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    } as any);
    const { navigate } = renderPage();

    await actor.click(await screen.findByRole("button", { name: /View Details/i }));

    expect(navigate).toHaveBeenCalledWith("/admin/orders/order-stripe-1");
  });
});
