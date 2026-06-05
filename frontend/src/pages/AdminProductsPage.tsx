import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Edit3, Plus, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import { api } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import { formatMoney } from "../lib/format";
import type {
  AdminProductInput,
  AdminProductListResponse,
  AdminProductResponse,
  AsyncState,
  CategoriesResponse,
  Category,
  Navigate,
  Product,
  PublicUser,
} from "../types";

type AdminProductsPageProps = {
  userState: AsyncState<PublicUser | null>;
  navigate: Navigate;
};

type ProductDraft = {
  name: string;
  category: string;
  description: string;
  price: string;
  originalPrice: string;
  discountPercent: string;
  rating: string;
  reviewCount: string;
  stockStatus: string;
  colors: string;
  sizes: string;
  isNew: boolean;
  flags: string;
  image: string;
};

const emptyDraft: ProductDraft = {
  name: "",
  category: "",
  description: "",
  price: "0",
  originalPrice: "0",
  discountPercent: "0",
  rating: "0",
  reviewCount: "0",
  stockStatus: "In Stock",
  colors: "",
  sizes: "",
  isNew: false,
  flags: "",
  image: "",
};

const stockStatuses = ["In Stock", "Out of Stock", "Preorder"];

function listToText(values: string[] = []) {
  return values.join(", ");
}

function textToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function productToDraft(product: Product): ProductDraft {
  return {
    name: product.name,
    category: product.category,
    description: product.description,
    price: String(product.price),
    originalPrice: String(product.originalPrice),
    discountPercent: String(product.discountPercent),
    rating: String(product.rating),
    reviewCount: String(product.reviewCount),
    stockStatus: product.stockStatus,
    colors: listToText(product.colors),
    sizes: listToText(product.sizes),
    isNew: product.isNew,
    flags: listToText(product.flags),
    image: product.image,
  };
}

function draftToPayload(draft: ProductDraft): AdminProductInput {
  return {
    name: draft.name.trim(),
    category: draft.category.trim(),
    description: draft.description.trim(),
    price: Number(draft.price || 0),
    originalPrice: Number(draft.originalPrice || 0),
    discountPercent: Number(draft.discountPercent || 0),
    rating: Number(draft.rating || 0),
    reviewCount: Number(draft.reviewCount || 0),
    stockStatus: draft.stockStatus,
    colors: textToList(draft.colors),
    sizes: textToList(draft.sizes),
    isNew: draft.isNew,
    flags: textToList(draft.flags),
    image: draft.image.trim(),
  };
}

export function AdminProductsPage({ userState, navigate }: AdminProductsPageProps) {
  const [productsState, setProductsState] = useState<AsyncState<Product[]>>({
    data: [],
    loading: false,
    error: "",
  });
  const [categoriesState, setCategoriesState] = useState<AsyncState<Category[]>>({
    data: [],
    loading: false,
    error: "",
  });
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const canLoadProducts = userState.data?.role === "admin";

  const loadProducts = useCallback(async () => {
    if (!canLoadProducts) return;
    const params = new URLSearchParams({ limit: "50" });
    if (submittedQuery) params.set("q", submittedQuery);

    setProductsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<AdminProductListResponse>(
        `/api/admin/products?${params.toString()}`,
      );
      setProductsState({ data: data.products, loading: false, error: "" });
      setTotal(data.total);
    } catch (error) {
      setProductsState((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }, [canLoadProducts, submittedQuery]);

  const loadCategories = useCallback(async () => {
    if (!canLoadProducts) return;
    setCategoriesState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<CategoriesResponse>("/api/categories");
      setCategoriesState({ data: data.categories, loading: false, error: "" });
      setDraft((current) =>
        current.category || !data.categories[0]
          ? current
          : { ...current, category: data.categories[0].id },
      );
    } catch (error) {
      setCategoriesState((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }, [canLoadProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const categoryNames = useMemo(
    () =>
      new Map(
        categoriesState.data.map((category) => [
          category.id,
          `${category.label} (${category.id})`,
        ]),
      ),
    [categoriesState.data],
  );

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedQuery(query.trim());
  };

  const startCreate = () => {
    setEditingProductId(null);
    setDraft({
      ...emptyDraft,
      category: categoriesState.data[0]?.id || "",
    });
    setFormError("");
    setFormSuccess("");
  };

  const startEdit = (product: Product) => {
    setEditingProductId(product.id);
    setDraft(productToDraft(product));
    setFormError("");
    setFormSuccess("");
  };

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    try {
      const payload = draftToPayload(draft);
      const path = editingProductId
        ? `/api/admin/products/${editingProductId}`
        : "/api/admin/products";
      const data = await api<AdminProductResponse>(path, {
        method: editingProductId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setProductsState((current) => {
        const exists = current.data.some((product) => product.id === data.product.id);
        return {
          ...current,
          data: exists
            ? current.data.map((product) =>
                product.id === data.product.id ? data.product : product,
              )
            : [data.product, ...current.data],
        };
      });
      if (!editingProductId) setTotal((current) => current + 1);
      setEditingProductId(data.product.id);
      setDraft(productToDraft(data.product));
      setFormSuccess(editingProductId ? "Product updated." : "Product created.");
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    setDeletingId(product.id);
    setFormError("");
    setFormSuccess("");
    try {
      await api(`/api/admin/products/${product.id}`, { method: "DELETE" });
      setProductsState((current) => ({
        ...current,
        data: current.data.filter((item) => item.id !== product.id),
      }));
      setTotal((current) => Math.max(0, current - 1));
      if (editingProductId === product.id) startCreate();
      setFormSuccess("Product deleted.");
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setDeletingId("");
    }
  };

  const updateDraft = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  if (userState.loading) {
    return (
      <main className="container page">
        <LoadingState title="Loading admin" message="We are checking your access." />
      </main>
    );
  }

  if (!userState.data) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Admin", "Products"]} />
        <EmptyState
          title="Admin access requires sign in"
          message="Sign in with an administrator account to manage products."
          action={{ label: "Sign In", onClick: () => navigate("/account") }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  if (userState.data.role !== "admin") {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Admin", "Products"]} />
        <ErrorState
          title="Admin access required"
          message="Product management is only available to administrators."
          action={{ label: "View Account", onClick: () => navigate("/account") }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  return (
    <main className="container page admin-catalog-page">
      <Breadcrumbs items={["Home", "Admin", "Products"]} />
      <section className="admin-orders-hero">
        <div>
          <p className="eyebrow">Admin console</p>
          <h1 className="page-title">Product catalog</h1>
          <p>Manage product records, merchandising flags, option labels, and image keys.</p>
        </div>
        <div className="admin-catalog-nav" aria-label="Admin sections">
          <Button onClick={() => navigate("/admin/products")}>Products</Button>
          <Button variant="ghost" onClick={() => navigate("/admin/categories")}>Categories</Button>
          <Button variant="ghost" onClick={() => navigate("/admin/orders")}>Orders</Button>
        </div>
      </section>

      <section className="admin-orders-toolbar" aria-label="Product tools">
        <form className="admin-orders-search" onSubmit={submitSearch}>
          <label>
            Product search
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Keyboard, jacket, sale"
            />
          </label>
          <Button type="submit" variant="ghost">
            <Search size={16} />
            Search
          </Button>
        </form>
        <Button onClick={loadProducts} disabled={productsState.loading}>
          <RefreshCw size={16} />
          {productsState.loading ? "Refreshing" : "Refresh"}
        </Button>
        <Button onClick={startCreate}>
          <Plus size={16} />
          New Product
        </Button>
        <span className="admin-catalog-count">{total} total</span>
      </section>

      {(productsState.error || categoriesState.error) && (
        <p className="form-status form-status--error">
          {productsState.error || categoriesState.error}
        </p>
      )}
      {formError && <p className="form-status form-status--error">{formError}</p>}
      {formSuccess && <p className="form-status form-status--success">{formSuccess}</p>}

      <section className="admin-catalog-layout">
        <div className="admin-catalog-list" aria-label="Admin product list">
          {!productsState.loading && !productsState.error && !productsState.data.length && (
            <p className="admin-orders-empty">No products match this search.</p>
          )}
          {productsState.data.map((product) => (
            <article className="admin-catalog-row" key={product.id}>
              <div className="admin-catalog-row__main">
                <strong>{product.name}</strong>
                <span>{product.id}</span>
              </div>
              <div className="admin-catalog-row__meta">
                <span>{categoryNames.get(product.category) || product.category}</span>
                <strong>{formatMoney(product.price)}</strong>
                <span>{product.stockStatus}</span>
                <span>{product.flags.length ? product.flags.join(", ") : "No flags"}</span>
                <span>{product.image || "No image key"}</span>
              </div>
              <div className="admin-catalog-row__actions">
                <Button variant="ghost" onClick={() => startEdit(product)}>
                  <Edit3 size={16} />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => deleteProduct(product)}
                  disabled={deletingId === product.id}
                >
                  <Trash2 size={16} />
                  {deletingId === product.id ? "Deleting" : "Delete"}
                </Button>
              </div>
            </article>
          ))}
        </div>

        <aside className="admin-catalog-form-card">
          <div className="admin-catalog-form-card__header">
            <div>
              <p className="eyebrow">{editingProductId ? "Edit product" : "Create product"}</p>
              <h2>{editingProductId || "New product"}</h2>
            </div>
            {editingProductId && (
              <Button variant="ghost" onClick={startCreate}>
                <X size={16} />
                Clear
              </Button>
            )}
          </div>
          <form className="admin-catalog-form" onSubmit={submitProduct}>
            <label>
              Name
              <input value={draft.name} onChange={(event) => updateDraft("name", event.target.value)} required />
            </label>
            <label>
              Category
              <select value={draft.category} onChange={(event) => updateDraft("category", event.target.value)} required>
                <option value="" disabled>Select category</option>
                {categoriesState.data.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label} ({category.id})
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-catalog-form__wide">
              Description
              <textarea value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} />
            </label>
            <label>
              Price
              <input type="number" min="0" value={draft.price} onChange={(event) => updateDraft("price", event.target.value)} />
            </label>
            <label>
              Original price
              <input type="number" min="0" value={draft.originalPrice} onChange={(event) => updateDraft("originalPrice", event.target.value)} />
            </label>
            <label>
              Discount percent
              <input type="number" min="0" max="100" value={draft.discountPercent} onChange={(event) => updateDraft("discountPercent", event.target.value)} />
            </label>
            <label>
              Rating
              <input type="number" min="0" max="5" step="0.1" value={draft.rating} onChange={(event) => updateDraft("rating", event.target.value)} />
            </label>
            <label>
              Review count
              <input type="number" min="0" value={draft.reviewCount} onChange={(event) => updateDraft("reviewCount", event.target.value)} />
            </label>
            <label>
              Stock status
              <select value={draft.stockStatus} onChange={(event) => updateDraft("stockStatus", event.target.value)}>
                {stockStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label>
              Colors
              <input value={draft.colors} onChange={(event) => updateDraft("colors", event.target.value)} placeholder="Black, White" />
            </label>
            <label>
              Sizes
              <input value={draft.sizes} onChange={(event) => updateDraft("sizes", event.target.value)} placeholder="S, M, L" />
            </label>
            <label>
              Flags
              <input value={draft.flags} onChange={(event) => updateDraft("flags", event.target.value)} placeholder="flash, best" />
            </label>
            <label>
              Image key
              <input value={draft.image} onChange={(event) => updateDraft("image", event.target.value)} placeholder="product-image-key" />
            </label>
            <label className="admin-catalog-check">
              <input type="checkbox" checked={draft.isNew} onChange={(event) => updateDraft("isNew", event.target.checked)} />
              New arrival
            </label>
            <div className="admin-catalog-form__actions">
              <Button type="submit" disabled={saving}>
                <Save size={16} />
                {saving ? "Saving" : editingProductId ? "Update Product" : "Create Product"}
              </Button>
            </div>
          </form>
        </aside>
      </section>
    </main>
  );
}
