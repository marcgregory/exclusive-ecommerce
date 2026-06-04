/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminOrdersPage } from "./AdminOrdersPage";
import type { AdminOrder, PublicUser } from "../types";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, api: vi.fn() };
});
import { api } from "../api/client";

const mockedApi = vi.mocked(api);

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

  const view = render(<AdminOrdersPage {...props} />);
  return { ...props, ...view };
}

describe("AdminOrdersPage", () => {
  beforeEach(() => {
    mockedApi.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("requires an admin user", () => {
    renderPage(customer);

    expect(screen.getByText(/Admin access required/i)).toBeDefined();
    expect(mockedApi).not.toHaveBeenCalled();
  });

  it("loads admin orders and highlights Stripe orders that need review", async () => {
    mockedApi.mockResolvedValue({
      orders: [stripeOrder],
      total: 1,
      page: 1,
      limit: 50,
    });

    renderPage();

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith("/api/admin/orders?limit=50"),
    );
    expect(await screen.findByText("order-stripe-1")).toBeDefined();
    expect(screen.getByText(/buyer@example.com/i)).toBeDefined();
    expect(screen.getByText(/Stripe review/i)).toBeDefined();
    expect(screen.getByText("Needs review")).toBeDefined();
  });

  it("filters orders by status and customer email", async () => {
    const actor = userEvent.setup();
    mockedApi.mockResolvedValue({
      orders: [],
      total: 0,
      page: 1,
      limit: 50,
    });

    renderPage();

    await actor.selectOptions(screen.getByLabelText(/Status/i), "cancelled");
    await actor.type(screen.getByLabelText(/Customer email/i), "buyer@example.com");
    await actor.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenLastCalledWith(
        "/api/admin/orders?limit=50&status=cancelled&email=buyer%40example.com",
      ),
    );
  });

  it("navigates to admin order details", async () => {
    const actor = userEvent.setup();
    mockedApi.mockResolvedValue({
      orders: [stripeOrder],
      total: 1,
      page: 1,
      limit: 50,
    });
    const { navigate } = renderPage();

    await actor.click(await screen.findByRole("button", { name: /View Details/i }));

    expect(navigate).toHaveBeenCalledWith("/admin/orders/order-stripe-1");
  });
});
