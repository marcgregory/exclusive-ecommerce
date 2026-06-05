/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../api/client";
import { AdminCouponsPage } from "./AdminCouponsPage";
import type { Coupon, PublicUser } from "../types";

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

const coupon: Coupon = {
  code: "EXCLUSIVE10",
  type: "percent",
  amount: 10,
  active: true,
};

const fixedCoupon: Coupon = {
  code: "SAVE50",
  type: "fixed",
  amount: 50,
  active: false,
};

function mockCouponApi(coupons: Coupon[] = [coupon, fixedCoupon]) {
  mockedApi.mockImplementation(async (path, options) => {
    if (path === "/api/admin/coupons" && options?.method === "POST") {
      return {
        coupon: {
          ...(JSON.parse(options.body as string) as Coupon),
        },
      };
    }
    if (path === "/api/admin/coupons") return { coupons };
    if (path === "/api/admin/coupons/EXCLUSIVE10" && options?.method === "PATCH") {
      return {
        coupon: {
          ...coupon,
          ...(JSON.parse(options.body as string) as Partial<Coupon>),
        },
      };
    }
    if (path === "/api/admin/coupons/EXCLUSIVE10" && options?.method === "DELETE") {
      return { ok: true };
    }
    throw new Error(`Unexpected API call: ${path}`);
  });
}

function renderPage(user: PublicUser | null = admin) {
  const props = {
    userState: { data: user, loading: false, error: "" },
    navigate: vi.fn(),
  };

  const view = render(<AdminCouponsPage {...props} />);
  return { ...props, ...view };
}

describe("AdminCouponsPage", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("does not load coupon management for non-admin users", () => {
    renderPage(customer);

    expect(screen.getByText(/Admin access required/i)).toBeDefined();
    expect(mockedApi).not.toHaveBeenCalled();
  });

  it("loads and renders coupon rows for admins", async () => {
    mockCouponApi();
    renderPage();

    await waitFor(() => expect(mockedApi).toHaveBeenCalledWith("/api/admin/coupons"));
    const row = (await screen.findByText("EXCLUSIVE10")).closest("article");
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText("10% off")).toBeDefined();
    expect(within(row as HTMLElement).getByText("Percent")).toBeDefined();
    expect(screen.getByText("1 active")).toBeDefined();
    expect(screen.getByText("1 inactive")).toBeDefined();
  });

  it("creates a fixed inactive coupon and renders the returned row", async () => {
    const actor = userEvent.setup();
    mockCouponApi([]);
    renderPage();

    await actor.type(await screen.findByLabelText(/Code/i), "vip25");
    await actor.selectOptions(screen.getByLabelText(/Discount type/i), "fixed");
    await actor.clear(screen.getByLabelText(/Amount/i));
    await actor.type(screen.getByLabelText(/Amount/i), "25");
    await actor.click(screen.getByLabelText(/Active at checkout/i));
    await actor.click(screen.getByRole("button", { name: /Create Coupon/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/api/admin/coupons",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const createCall = mockedApi.mock.calls.find(
      ([path, options]) => path === "/api/admin/coupons" && options?.method === "POST",
    );
    expect(JSON.parse(createCall?.[1]?.body as string)).toEqual({
      code: "VIP25",
      type: "fixed",
      amount: 25,
      active: false,
    });
    const row = (await screen.findAllByText("VIP25"))[0].closest("article");
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText("$25 off")).toBeDefined();
  });

  it("edits a coupon and updates the row", async () => {
    const actor = userEvent.setup();
    mockCouponApi([coupon]);
    renderPage();

    const row = (await screen.findByText("EXCLUSIVE10")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Edit/i }));
    await actor.clear(screen.getByLabelText(/Amount/i));
    await actor.type(screen.getByLabelText(/Amount/i), "15");
    await actor.click(screen.getByLabelText(/Active at checkout/i));
    await actor.click(screen.getByRole("button", { name: /Update Coupon/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/api/admin/coupons/EXCLUSIVE10",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    const patchCall = mockedApi.mock.calls.find(
      ([path, options]) => path === "/api/admin/coupons/EXCLUSIVE10" && options?.method === "PATCH",
    );
    expect(JSON.parse(patchCall?.[1]?.body as string)).toMatchObject({
      code: "EXCLUSIVE10",
      amount: 15,
      active: false,
    });
    expect(await screen.findByText("15% off")).toBeDefined();
  });

  it("deletes a coupon on success", async () => {
    const actor = userEvent.setup();
    mockCouponApi([coupon]);
    renderPage();

    const row = (await screen.findByText("EXCLUSIVE10")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Delete/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/api/admin/coupons/EXCLUSIVE10",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    expect(screen.queryByText("EXCLUSIVE10")).toBeNull();
  });

  it("keeps a coupon visible when delete fails", async () => {
    const actor = userEvent.setup();
    mockedApi.mockImplementation(async (path, options) => {
      if (path === "/api/admin/coupons") return { coupons: [coupon] };
      if (path === "/api/admin/coupons/EXCLUSIVE10" && options?.method === "DELETE") {
        throw new ApiError("Coupon could not be deleted", 400);
      }
      throw new Error(`Unexpected API call: ${path}`);
    });
    renderPage();

    const row = (await screen.findByText("EXCLUSIVE10")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Delete/i }));

    expect(await screen.findByText(/Coupon could not be deleted/i)).toBeDefined();
    expect(screen.getByText("EXCLUSIVE10")).toBeDefined();
  });
});
