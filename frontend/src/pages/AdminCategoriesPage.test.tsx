/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { AdminCategoriesPage } from "./AdminCategoriesPage";
import { ecommerceApi } from "../api/ecommerceApi";
import type { Category, PublicUser } from "../types";

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

let serverCategories: Category[] = [category, phones];
let simulateDeleteError = false;

globalThis.fetch = vi.fn(async (url: string | URL | Request, options?: RequestInit) => {
  let urlStr: string;
  let method: string;

  if (typeof url === "string") {
    urlStr = url;
    method = options?.method || "GET";
  } else if (url instanceof URL) {
    urlStr = url.toString();
    method = options?.method || "GET";
  } else {
    urlStr = url.url;
    method = url.method;
  }

  const urlObj = new URL(urlStr, "http://localhost");
  const path = urlObj.pathname;
  console.log(`[FETCH] ${method} ${path} (full: ${urlStr})`);

  let body: any = null;
  if (url instanceof Request) {
    try {
      const text = await url.clone().text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {}
  } else if (options?.body && typeof options.body === "string") {
    try {
      body = JSON.parse(options.body);
    } catch (e) {}
  }

  if (path === "/api/categories" && method === "GET") {
    return new Response(JSON.stringify({ categories: serverCategories }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (path === "/api/admin/categories" && method === "POST") {
    const newCategory: Category = {
      id: "gaming",
      ...body,
    };
    serverCategories.push(newCategory);
    return new Response(JSON.stringify({ category: newCategory }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (path.match(/^\/api\/admin\/categories\/[^/]+$/) && method === "PATCH") {
    const categoryId = path.split("/").pop();
    const idx = serverCategories.findIndex((c) => c.id === categoryId);
    if (idx >= 0) {
      const updatedCategory = { ...serverCategories[idx], ...body };
      serverCategories[idx] = updatedCategory;
      return new Response(JSON.stringify({ category: updatedCategory }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ message: "Not found" }), { status: 404 });
  }

  if (path.match(/^\/api\/admin\/categories\/[^/]+$/) && method === "DELETE") {
    if (simulateDeleteError) {
      return new Response(JSON.stringify({ message: "Category is still used by products" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const categoryId = path.split("/").pop();
    serverCategories = serverCategories.filter((c) => c.id !== categoryId);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return Promise.reject(new Error(`Unexpected API call: ${method} ${path}`));
}) as any;

async function getFetchCall(pathSubstring: string, method: string) {
  for (const [req, opts] of vi.mocked(globalThis.fetch).mock.calls) {
    let url = "";
    let m = "GET";
    if (typeof req === "string") {
      url = req;
      m = opts?.method || "GET";
    } else if (req instanceof URL) {
      url = req.toString();
      m = opts?.method || "GET";
    } else if (req && typeof req === "object" && "url" in req) {
      url = req.url;
      m = req.method;
    }
    if (url.includes(pathSubstring) && m.toUpperCase() === method.toUpperCase()) {
      let body: any = null;
      if (req instanceof Request) {
        try {
          const text = await req.clone().text();
          if (text) body = JSON.parse(text);
        } catch (e) {}
      } else if (opts?.body && typeof opts.body === "string") {
        try {
          body = JSON.parse(opts.body);
        } catch (e) {}
      }
      return { url, method: m, body };
    }
  }
  return null;
}

function renderPage(user: PublicUser | null = admin) {
  const props = {
    userState: { data: user, loading: false, error: "" },
    navigate: vi.fn(),
  };

  const store = configureStore({
    reducer: {
      [ecommerceApi.reducerPath]: ecommerceApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(ecommerceApi.middleware),
  });

  const view = render(
    <Provider store={store}>
      <AdminCategoriesPage {...props} />
    </Provider>
  );
  return { ...props, ...view, store };
}

describe("AdminCategoriesPage", () => {
  beforeEach(() => {
    serverCategories = [category, phones];
    simulateDeleteError = false;
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    serverCategories = [category, phones];
    simulateDeleteError = false;
    vi.restoreAllMocks();
    cleanup();
  });

  it("does not load category management for non-admin users", () => {
    renderPage(customer);

    expect(screen.getByText(/Admin access required/i)).toBeDefined();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("loads and renders categories for admins", async () => {
    renderPage();

    await waitFor(async () => {
      const call = await getFetchCall("/api/categories", "GET");
      expect(call).toBeTruthy();
    });
    const row = (await screen.findByText("Electronics")).closest("article");
    expect(row).toBeTruthy();
    expect(within(row as HTMLElement).getByText("phones")).toBeDefined();
  });

  it("creates a category with generated and manually edited slugs", async () => {
    const actor = userEvent.setup();
    serverCategories = [];
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

    let body: any = null;
    await waitFor(async () => {
      const call = await getFetchCall("/api/admin/categories", "POST");
      expect(call).toBeTruthy();
      body = call?.body;
    });
    expect(body).toEqual({
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
    renderPage();

    const row = (await screen.findByText("Electronics")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Edit/i }));
    await actor.clear(screen.getByLabelText(/Label/i));
    await actor.type(screen.getByLabelText(/Label/i), "Devices");
    await actor.clear(screen.getByLabelText(/Children/i));
    await actor.type(screen.getByLabelText(/Children/i), "phones, cameras");
    await actor.click(screen.getByRole("button", { name: /Update Category/i }));

    let body: any = null;
    await waitFor(async () => {
      const call = await getFetchCall("/api/admin/categories/electronics", "PATCH");
      expect(call).toBeTruthy();
      body = call?.body;
    });
    expect(body).toMatchObject({
      label: "Devices",
      slug: "electronics",
      children: ["phones", "cameras"],
    });
    expect(await screen.findByText("Devices")).toBeDefined();
  });

  it("deletes a category on success", async () => {
    const actor = userEvent.setup();
    renderPage();

    const row = (await screen.findByText("Electronics")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Delete/i }));

    await waitFor(async () => {
      const call = await getFetchCall("/api/admin/categories/electronics", "DELETE");
      expect(call).toBeTruthy();
    });
    expect(screen.queryByText("Electronics")).toBeNull();
  });

  it("keeps a category visible when delete fails", async () => {
    const actor = userEvent.setup();
    simulateDeleteError = true;
    renderPage();

    const row = (await screen.findByText("Electronics")).closest("article");
    expect(row).toBeTruthy();
    await actor.click(within(row as HTMLElement).getByRole("button", { name: /Delete/i }));

    expect(await screen.findByText(/Category is still used by products/i)).toBeDefined();
    expect(screen.getByText("Electronics")).toBeDefined();
  });
});

