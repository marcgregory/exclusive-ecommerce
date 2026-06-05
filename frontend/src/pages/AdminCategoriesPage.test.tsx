/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../api/client";
import { AdminCategoriesPage } from "./AdminCategoriesPage";
import type { Category, PublicUser } from "../types";

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

const category: Category = {
  id: "electronics",
  label: "Electronics",
  slug: "electronics",
  icon: "device",
  children: ["phones"],
};

const phones: Category = {
  id: "phones",
  label: "Phones",
  slug: "phones",
  icon: "phone",
  children: [],
};

function mockCategoryApi(categories: Category[] = [category, phones]) {
  mockedApi.mockImplementation(async (path, options) => {
    if (path === "/api/categories") return { categories };
    if (path === "/api/admin/categories" && options.method === "POST") {
      return {
        category: {
          id: "gaming",
          ...(JSON.parse(options.body as string) as Partial<Category>),
        },
      };
    }
    if (path === "/api/admin/categories/electronics" && options.method === "PATCH") {
      return {
        category: {
          ...category,
          ...(JSON.parse(options.body as string) as Partial<Category>),
        },
      };
    }
    if (path === "/api/admin/categories/electronics" && options.method === "DELETE") {
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

  const view = render(<AdminCategoriesPage {...props} />);
  return { ...props, ...view };
}

describe("AdminCategoriesPage", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("does not load category management for non-admin users", () => {
    renderPage(customer);

    expect(screen.getByText(/Admin access required/i)).toBeDefined();
    expect(mockedApi).not.toHaveBeenCalled();
  });

  it("loads and renders categories for admins", async () => {
    mockCategoryApi();
    renderPage();

    await waitFor(() => expect(mockedApi).toHaveBeenCalledWith("/api/categories"));
    const row = (await screen.findByText("Electronics")).closest("article");
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText("phones")).toBeDefined();
  });

  it("creates a category with generated and manually edited slugs", async () => {
    const actor = userEvent.setup();
    mockCategoryApi([]);
    renderPage();

    await actor.type(await screen.findByLabelText(/Label/i), "Gaming Gear");
    expect(screen.getByLabelText<HTMLInputElement>(/Slug/i).value).toBe("gaming-gear");
    await actor.clear(screen.getByLabelText(/Slug/i));
    await actor.type(screen.getByLabelText(/Slug/i), "gaming");
    await actor.type(screen.getByLabelText(/Icon key/i), "gamepad");
    await actor.type(screen.getByLabelText(/Children/i), "consoles, controllers");
    await actor.clear(screen.getByLabelText(/Sort order/i));
    await actor.type(screen.getByLabelText(/Sort order/i), "4");
    await actor.click(screen.getByRole("button", { name: /Create Category/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/api/admin/categories",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const createCall = mockedApi.mock.calls.find(([path]) => path === "/api/admin/categories");
    expect(JSON.parse(createCall?.[1]?.body as string)).toEqual({
      label: "Gaming Gear",
      slug: "gaming",
      icon: "gamepad",
      children: ["consoles", "controllers"],
      sortOrder: 4,
      parentId: null,
    });
    expect(await screen.findByText("Gaming Gear")).toBeDefined();
  });

  it("edits a category and updates the row", async () => {
    const actor = userEvent.setup();
    mockCategoryApi();
    renderPage();

    const row = (await screen.findByText("Electronics")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Edit/i }));
    await actor.clear(screen.getByLabelText(/Label/i));
    await actor.type(screen.getByLabelText(/Label/i), "Devices");
    await actor.clear(screen.getByLabelText(/Children/i));
    await actor.type(screen.getByLabelText(/Children/i), "phones, cameras");
    await actor.click(screen.getByRole("button", { name: /Update Category/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/api/admin/categories/electronics",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    const patchCall = mockedApi.mock.calls.find(([path, options]) => (
      path === "/api/admin/categories/electronics" && options.method === "PATCH"
    ));
    expect(JSON.parse(patchCall?.[1]?.body as string)).toMatchObject({
      label: "Devices",
      slug: "electronics",
      children: ["phones", "cameras"],
    });
    expect(await screen.findByText("Devices")).toBeDefined();
  });

  it("deletes a category on success", async () => {
    const actor = userEvent.setup();
    mockCategoryApi();
    renderPage();

    const row = (await screen.findByText("Electronics")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Delete/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/api/admin/categories/electronics",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    expect(screen.queryByText("Electronics")).toBeNull();
  });

  it("keeps a category visible when delete fails", async () => {
    const actor = userEvent.setup();
    mockedApi.mockImplementation(async (path, options) => {
      if (path === "/api/categories") return { categories: [category] };
      if (path === "/api/admin/categories/electronics" && options.method === "DELETE") {
        throw new ApiError("Category is still used by products", 400);
      }
      throw new Error(`Unexpected API call: ${path}`);
    });
    renderPage();

    const row = (await screen.findByText("Electronics")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Delete/i }));

    expect(await screen.findByText(/Category is still used by products/i)).toBeDefined();
    expect(screen.getByText("Electronics")).toBeDefined();
  });
});
