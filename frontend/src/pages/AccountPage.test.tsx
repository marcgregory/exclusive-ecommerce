/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccountPage } from "./AccountPage";
import type { Order, PublicUser } from "../types";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return { ...actual, api: vi.fn() };
});
import { api } from "../api/client";

const mockedApi = vi.mocked(api);

const user: PublicUser = {
  id: "user-1",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  address: "123 Maple Drive",
  role: "customer",
};

const order: Order = {
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
  ],
  billing: {
    firstName: "Jane",
    lastName: "Doe",
    streetAddress: "123 Maple Drive",
    townCity: "Townsville",
    phone: "555-0123",
    email: "jane@example.com",
  },
  paymentMethod: "bank",
  subtotal: 5000,
  discount: 500,
  shipping: 0,
  total: 4500,
  status: "shipped",
  createdAt: "2026-04-10T12:00:00.000Z",
};

function renderPage(overrides: Partial<Parameters<typeof AccountPage>[0]> = {}) {
  const props = {
    userState: { data: user, loading: false, error: "" },
    onAuthChanged: vi.fn(),
    onUserRefresh: vi.fn().mockResolvedValue(undefined),
    navigate: vi.fn(),
    ...overrides,
  };

  const view = render(<AccountPage {...props} />);
  return { ...props, ...view };
}

describe("AccountPage", () => {
  beforeEach(() => {
    mockedApi.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a guest sign-in state", () => {
    renderPage({ userState: { data: null, loading: false, error: "" } });

    expect(screen.getByText(/Sign in to continue/i)).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: /Sign In/i })).toBeDefined();
    expect(screen.getByLabelText(/Email/i)).toBeDefined();
    expect(screen.getByLabelText(/Password/i)).toBeDefined();
    expect(mockedApi).not.toHaveBeenCalled();
  });

  it("renders the authenticated profile", async () => {
    mockedApi.mockResolvedValue({ orders: [] });
    renderPage();

    expect(screen.getByText(/Welcome!/i)).toBeDefined();
    expect(screen.getByDisplayValue("Jane")).toBeDefined();
    expect(screen.getByDisplayValue("Doe")).toBeDefined();
    expect(screen.getByDisplayValue("jane@example.com")).toBeDefined();
    await waitFor(() => expect(mockedApi).toHaveBeenCalledWith("/api/orders"));
  });

  it("shows order history loading and error states", async () => {
    mockedApi.mockRejectedValue(new Error("Orders unavailable"));
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Refreshing/i })).toBeDefined(),
    );
    expect(await screen.findByText(/Orders unavailable/i)).toBeDefined();
  });

  it("renders past orders", async () => {
    mockedApi.mockResolvedValue({ orders: [order] });
    renderPage();

    expect(await screen.findByText("order-1")).toBeDefined();
    expect(screen.getByText(/Apr 10, 2026/i)).toBeDefined();
    expect(screen.getByText(/Shipped/i)).toBeDefined();
    expect(screen.getByText(/1 item/i)).toBeDefined();
    expect(screen.getByText("$4500")).toBeDefined();
  });

  it("navigates to order details", async () => {
    const navigate = vi.fn();
    mockedApi.mockResolvedValue({ orders: [order] });
    renderPage({ navigate });

    await userEvent.click(
      await screen.findByRole("button", { name: /View Details/i }),
    );

    expect(navigate).toHaveBeenCalledWith("/orders/order-1");
  });

  it("submits profile updates without blank password fields", async () => {
    const updatedUser: PublicUser = {
      ...user,
      firstName: "Janet",
      lastName: "Stone",
      address: "456 Oak Street",
    };
    const onAuthChanged = vi.fn();
    mockedApi
      .mockResolvedValueOnce({ orders: [] })
      .mockResolvedValueOnce({ user: updatedUser });
    renderPage({ onAuthChanged });

    await userEvent.clear(screen.getByLabelText(/First Name/i));
    await userEvent.type(screen.getByLabelText(/First Name/i), "Janet");
    await userEvent.clear(screen.getByLabelText(/Last Name/i));
    await userEvent.type(screen.getByLabelText(/Last Name/i), "Stone");
    await userEvent.clear(screen.getByLabelText(/Address/i));
    await userEvent.type(screen.getByLabelText(/Address/i), "456 Oak Street");

    await userEvent.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/api/me",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    const [, options] = mockedApi.mock.calls.find(([path]) => path === "/api/me")!;
    expect(JSON.parse(options?.body as string)).toMatchObject({
      firstName: "Janet",
      lastName: "Stone",
      email: "jane@example.com",
      address: "456 Oak Street",
    });
    expect(JSON.parse(options?.body as string)).not.toHaveProperty("currentPassword");
    expect(JSON.parse(options?.body as string)).not.toHaveProperty("newPassword");
    expect(JSON.parse(options?.body as string)).not.toHaveProperty("confirmPassword");
    expect(onAuthChanged).toHaveBeenCalledWith(updatedUser);
    expect(await screen.findByText(/Profile saved/i)).toBeDefined();
  });
});
