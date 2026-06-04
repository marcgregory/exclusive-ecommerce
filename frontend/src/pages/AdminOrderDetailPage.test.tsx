/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminOrderDetailPage } from "./AdminOrderDetailPage";
import { ApiError } from "../api/client";
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

  const view = render(<AdminOrderDetailPage {...props} />);
  return { ...props, ...view };
}

describe("AdminOrderDetailPage", () => {
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

  it("renders order detail data for admins", async () => {
    mockedApi.mockResolvedValue({ order });

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
    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith("/api/admin/orders/order-1"),
    );
  });

  it("updates order status", async () => {
    const actor = userEvent.setup();
    mockedApi
      .mockResolvedValueOnce({ order })
      .mockResolvedValueOnce({ order: { ...order, status: "delivered" } });

    renderPage();

    await screen.findByRole("heading", { name: "order-1" });
    await actor.selectOptions(screen.getByLabelText(/Order status/i), "delivered");
    await actor.click(screen.getByRole("button", { name: /Update Status/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenLastCalledWith(
        "/api/admin/orders/order-1",
        {
          method: "PATCH",
          body: JSON.stringify({ status: "delivered" }),
        },
      ),
    );
    expect(await screen.findByText("Status updated.")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Delivered" })).toBeDefined();
  });

  it("saves the internal support note", async () => {
    const actor = userEvent.setup();
    mockedApi
      .mockResolvedValueOnce({ order })
      .mockResolvedValueOnce({
        order: { ...order, internalNote: "Followed up with customer." },
      });

    renderPage();

    const note = await screen.findByLabelText(/Note/i);
    await actor.clear(note);
    await actor.type(note, "Followed up with customer.");
    await actor.click(screen.getByRole("button", { name: /Save Note/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenLastCalledWith(
        "/api/admin/orders/order-1",
        {
          method: "PATCH",
          body: JSON.stringify({ internalNote: "Followed up with customer." }),
        },
      ),
    );
    expect(await screen.findByText("Internal note saved.")).toBeDefined();
    expect(screen.getByDisplayValue("Followed up with customer.")).toBeDefined();
  });

  it("renders order-not-found state for missing admin orders", async () => {
    mockedApi.mockRejectedValue(new ApiError("Missing order", 404));

    renderPage();

    expect(await screen.findByText(/Order not found/i)).toBeDefined();
  });
});
