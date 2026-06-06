/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { AdminOrderDetailPage } from "./AdminOrderDetailPage";
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

const order: AdminOrder = {
  id: "order-1",
  userId: "user-1",
  customerEmail: "buyer@example.com",
  customerName: "Buyer Example",
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
  subtotal: 5000,
  discount: 500,
  shipping: 500,
  total: 5000,
  status: "processing",
  internalNote: "Initial support note",
  createdAt: "2026-04-10T12:00:00.000Z",
};

function renderPage(user: PublicUser | null = admin) {
  const props = {
    id: "order-1",
    userState: { data: user, loading: false, error: "" },
    navigate: vi.fn(),
  };

  const view = render(
    <Provider store={store}>
      <AdminOrderDetailPage {...props} />
    </Provider>,
  );
  return { ...props, ...view };
}

describe("AdminOrderDetailPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("requires an admin user", () => {
    renderPage(customer);

    expect(screen.getByText(/Admin access required/i)).toBeDefined();
  });

  it("renders order detail data for admins", async () => {
    vi.spyOn(ecommerceApiModule, "useGetAdminOrderDetailQuery").mockReturnValue({
      data: { order },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    } as any);

    renderPage();

    expect(await screen.findByRole("heading", { name: "order-1" })).toBeDefined();
    expect(screen.getAllByText(/Buyer Example/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/buyer@example.com/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Classic Tee")).toBeDefined();
    expect(screen.getAllByText("stripe").length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("Initial support note")).toBeDefined();
    expect(screen.getByText("123 Maple Drive")).toBeDefined();
    expect(screen.getByText("Townsville")).toBeDefined();
    expect(screen.getAllByText("$5000").length).toBeGreaterThan(0);
  });

  it("updates order status", async () => {
    const actor = userEvent.setup();
    const mockMutation = vi.fn().mockResolvedValue({
      unwrap: vi.fn().mockResolvedValue({
        order: { ...order, status: "delivered" },
      }),
    });

    vi.spyOn(ecommerceApiModule, "useGetAdminOrderDetailQuery").mockReturnValue({
      data: { order },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(ecommerceApiModule, "useUpdateAdminOrderMutation").mockReturnValue([
      mockMutation,
      { isLoading: false },
    ] as any);

    renderPage();

    await screen.findByRole("heading", { name: "order-1" });
    await actor.selectOptions(screen.getByLabelText(/Order status/i), "delivered");
    await actor.click(screen.getByRole("button", { name: /Update Status/i }));

    await waitFor(() => {
      expect(mockMutation).toHaveBeenCalledWith({
        id: "order-1",
        updates: { status: "delivered" },
      });
    });
  });

  it("saves the internal support note", async () => {
    const actor = userEvent.setup();
    const mockMutation = vi.fn().mockResolvedValue({
      unwrap: vi.fn().mockResolvedValue({
        order: { ...order, internalNote: "Followed up with customer." },
      }),
    });

    vi.spyOn(ecommerceApiModule, "useGetAdminOrderDetailQuery").mockReturnValue({
      data: { order },
      isLoading: false,
      error: undefined,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(ecommerceApiModule, "useUpdateAdminOrderMutation").mockReturnValue([
      mockMutation,
      { isLoading: false },
    ] as any);

    renderPage();

    const note = await screen.findByLabelText(/Note/i);
    await actor.clear(note);
    await actor.type(note, "Followed up with customer.");
    await actor.click(screen.getByRole("button", { name: /Save Note/i }));

    await waitFor(() => {
      expect(mockMutation).toHaveBeenCalledWith({
        id: "order-1",
        updates: { internalNote: "Followed up with customer." },
      });
    });
  });

  it("renders order-not-found state for missing admin orders", async () => {
    vi.spyOn(ecommerceApiModule, "useGetAdminOrderDetailQuery").mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { status: 404, data: { message: "Order not found" } },
      refetch: vi.fn(),
    } as any);

    renderPage();

    expect(await screen.findByText(/Order not found/i)).toBeDefined();
  });
});
