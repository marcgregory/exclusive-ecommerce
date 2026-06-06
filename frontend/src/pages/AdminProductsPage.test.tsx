/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminProductsPage } from "./AdminProductsPage";
import type { Category, Product, PublicUser } from "../types";

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

const categories: Category[] = [
  { id: "electronics", label: "Electronics", slug: "electronics", icon: "device", children: [] },
  { id: "fashion", label: "Fashion", slug: "fashion", icon: "shirt", children: [] },
];

const product: Product = {
  id: "product-1",
  name: "Gaming Keyboard",
  category: "electronics",
  description: "A responsive keyboard.",
  price: 9900,
  originalPrice: 12900,
  discountPercent: 23,
  rating: 4.8,
  reviewCount: 42,
  stockStatus: "In Stock",
  colors: ["Black"],
  sizes: ["M"],
  isNew: false,
  flags: ["best"],
  image: "keyboard",
};

function mockAdminApi(products: Product[] = [product]) {
  mockedApi.mockImplementation(async (path, options) => {
    if (path === "/api/categories") return { categories };
    if (String(path).startsWith("/api/admin/products?")) {
      return { products, total: products.length, page: 1, limit: 50 };
    }
    if (path === "/api/admin/products" && options.method === "POST") {
      return {
        product: {
          ...product,
          id: "product-2",
          ...(JSON.parse(options.body as string) as Partial<Product>),
        },
      };
    }
    if (path === "/api/admin/products/product-1" && options.method === "PATCH") {
      return {
        product: {
          ...product,
          ...(JSON.parse(options.body as string) as Partial<Product>),
        },
      };
    }
    if (path === "/api/admin/uploads/product-image" && options.method === "POST") {
      return {
        upload: {
          url: "/uploads/product-images/2026/06/uploaded-keyboard.png",
          key: "2026/06/uploaded-keyboard.png",
          width: 800,
          height: 600,
          contentType: "image/png",
          size: 128,
        },
      };
    }
    if (path === "/api/admin/products/product-1" && options.method === "DELETE") {
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

  const view = render(<AdminProductsPage {...props} />);
  return { ...props, ...view };
}

describe("AdminProductsPage", () => {
  beforeEach(() => {
    mockedApi.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it("does not load admin products for non-admin users", () => {
    renderPage(customer);

    expect(screen.getByText(/Admin access required/i)).toBeDefined();
    expect(mockedApi).not.toHaveBeenCalled();
  });

  it("loads and renders admin product rows", async () => {
    mockAdminApi();
    renderPage();

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith("/api/admin/products?limit=50"),
    );
    const row = (await screen.findByText("Gaming Keyboard")).closest("article");
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText("Electronics (electronics)")).toBeDefined();
    expect(within(row as HTMLElement).getByText("keyboard")).toBeDefined();
  });

  it("searches admin products with q", async () => {
    const actor = userEvent.setup();
    mockAdminApi([]);
    renderPage();

    await actor.type(screen.getByLabelText(/Product search/i), "keyboard");
    await actor.click(screen.getByRole("button", { name: /Search/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenLastCalledWith("/api/admin/products?limit=50&q=keyboard"),
    );
  });

  it("creates a product and renders the returned row", async () => {
    const actor = userEvent.setup();
    mockAdminApi([]);
    renderPage();

    await screen.findByLabelText(/Name/i);
    await actor.type(screen.getByLabelText(/Name/i), "New Hoodie");
    await actor.selectOptions(screen.getByLabelText(/Category/i), "fashion");
    await actor.type(screen.getByLabelText(/Description/i), "Warm cotton hoodie.");
    await actor.clear(screen.getByLabelText(/^Price$/i));
    await actor.type(screen.getByLabelText(/^Price$/i), "7500");
    await actor.clear(screen.getByLabelText(/Original price/i));
    await actor.type(screen.getByLabelText(/Original price/i), "9000");
    await actor.type(screen.getByLabelText(/Colors/i), "Black, Cream");
    await actor.type(screen.getByLabelText(/Sizes/i), "S, M");
    await actor.type(screen.getByLabelText(/Flags/i), "flash, best");
    await actor.type(screen.getByLabelText(/Image URL or key/i), "hoodie");
    await actor.click(screen.getByLabelText(/New arrival/i));
    await actor.click(screen.getByRole("button", { name: /Create Product/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/api/admin/products",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const createCall = mockedApi.mock.calls.find(([path]) => path === "/api/admin/products");
    expect(JSON.parse(createCall?.[1]?.body as string)).toEqual({
      name: "New Hoodie",
      category: "fashion",
      description: "Warm cotton hoodie.",
      price: 7500,
      originalPrice: 9000,
      discountPercent: 0,
      rating: 0,
      reviewCount: 0,
      stockStatus: "In Stock",
      colors: ["Black", "Cream"],
      sizes: ["S", "M"],
      isNew: true,
      flags: ["flash", "best"],
      image: "hoodie",
    });
    expect(await screen.findByText("New Hoodie")).toBeDefined();
  });

  it("uploads a product image and saves the returned URL in the image field", async () => {
    const actor = userEvent.setup();
    mockAdminApi();
    renderPage();

    await screen.findByLabelText(/Image URL or key/i);
    const file = new File(["image"], "keyboard.png", { type: "image/png" });
    await actor.upload(screen.getByLabelText(/Upload image/i), file);

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/api/admin/uploads/product-image",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "image/png",
            "X-File-Name": "keyboard.png",
          }),
          body: file,
        }),
      ),
    );
    expect((screen.getByLabelText(/Image URL or key/i) as HTMLInputElement).value).toBe(
      "/uploads/product-images/2026/06/uploaded-keyboard.png",
    );
    expect(screen.getByText(/Image uploaded \(800x600\)/i)).toBeDefined();
  });

  it("edits a product and updates the row", async () => {
    const actor = userEvent.setup();
    mockAdminApi();
    renderPage();

    const row = (await screen.findByText("Gaming Keyboard")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Edit/i }));
    await actor.clear(screen.getByLabelText(/Name/i));
    await actor.type(screen.getByLabelText(/Name/i), "Studio Keyboard");
    await actor.clear(screen.getByLabelText(/Flags/i));
    await actor.type(screen.getByLabelText(/Flags/i), "related, best");
    await actor.click(screen.getByRole("button", { name: /Update Product/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/api/admin/products/product-1",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    const patchCall = mockedApi.mock.calls.find(([path, options]) => (
      path === "/api/admin/products/product-1" && options.method === "PATCH"
    ));
    expect(JSON.parse(patchCall?.[1]?.body as string)).toMatchObject({
      name: "Studio Keyboard",
      flags: ["related", "best"],
    });
    expect(await screen.findByText("Studio Keyboard")).toBeDefined();
  });

  it("deletes a product after confirmation", async () => {
    const actor = userEvent.setup();
    mockAdminApi();
    renderPage();

    const row = (await screen.findByText("Gaming Keyboard")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Delete/i }));

    await waitFor(() =>
      expect(mockedApi).toHaveBeenCalledWith(
        "/api/admin/products/product-1",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    expect(screen.queryByText("Gaming Keyboard")).toBeNull();
  });
});
