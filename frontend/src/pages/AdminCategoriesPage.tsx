import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Edit3, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { api } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import type {
  AdminCategoryInput,
  AdminCategoryResponse,
  AdminCategoryListResponse,
  AsyncState,
  Category,
  Navigate,
  PublicUser,
} from "../types";

type AdminCategoriesPageProps = {
  userState: AsyncState<PublicUser | null>;
  navigate: Navigate;
};

type CategoryDraft = {
  label: string;
  slug: string;
  icon: string;
  children: string;
  sortOrder: string;
  parentId: string;
};

const emptyDraft: CategoryDraft = {
  label: "",
  slug: "",
  icon: "",
  children: "",
  sortOrder: "0",
  parentId: "",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function textToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function categoryToDraft(category: Category): CategoryDraft {
  return {
    label: category.label,
    slug: category.slug,
    icon: category.icon,
    children: (category.children || []).join(", "),
    sortOrder: String(category.sortOrder ?? 0),
    parentId: category.parentId || "",
  };
}

function draftToPayload(draft: CategoryDraft): AdminCategoryInput {
  return {
    label: draft.label.trim(),
    slug: draft.slug.trim(),
    icon: draft.icon.trim(),
    children: textToList(draft.children),
    sortOrder: Number(draft.sortOrder || 0),
    parentId: draft.parentId.trim() || null,
  };
}

export function AdminCategoriesPage({ userState, navigate }: AdminCategoriesPageProps) {
  const [categoriesState, setCategoriesState] = useState<AsyncState<Category[]>>({
    data: [],
    loading: false,
    error: "",
  });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CategoryDraft>(emptyDraft);
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const canLoadCategories = userState.data?.role === "admin";

  const loadCategories = useCallback(async () => {
    if (!canLoadCategories) return;
    setCategoriesState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<AdminCategoryListResponse>("/api/categories");
      setCategoriesState({ data: data.categories, loading: false, error: "" });
    } catch (error) {
      setCategoriesState((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }, [canLoadCategories]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const startCreate = () => {
    setEditingCategoryId(null);
    setDraft(emptyDraft);
    setSlugEdited(false);
    setFormError("");
    setFormSuccess("");
  };

  const startEdit = (category: Category) => {
    setEditingCategoryId(category.id);
    setDraft(categoryToDraft(category));
    setSlugEdited(true);
    setFormError("");
    setFormSuccess("");
  };

  const submitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    setFormSuccess("");
    try {
      const payload = draftToPayload(draft);
      const path = editingCategoryId
        ? `/api/admin/categories/${editingCategoryId}`
        : "/api/admin/categories";
      const data = await api<AdminCategoryResponse>(path, {
        method: editingCategoryId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      setCategoriesState((current) => {
        const exists = current.data.some((category) => category.id === data.category.id);
        return {
          ...current,
          data: exists
            ? current.data.map((category) =>
                category.id === data.category.id ? data.category : category,
              )
            : [...current.data, data.category],
        };
      });
      setEditingCategoryId(data.category.id);
      setDraft(categoryToDraft(data.category));
      setSlugEdited(true);
      setFormSuccess(editingCategoryId ? "Category updated." : "Category created.");
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category: Category) => {
    if (!window.confirm(`Delete ${category.label}?`)) return;
    setDeletingId(category.id);
    setFormError("");
    setFormSuccess("");
    try {
      await api(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      setCategoriesState((current) => ({
        ...current,
        data: current.data.filter((item) => item.id !== category.id),
      }));
      if (editingCategoryId === category.id) startCreate();
      setFormSuccess("Category deleted.");
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setDeletingId("");
    }
  };

  const updateLabel = (value: string) => {
    setDraft((current) => ({
      ...current,
      label: value,
      slug: editingCategoryId || slugEdited ? current.slug : slugify(value),
    }));
  };

  const updateDraft = <K extends keyof CategoryDraft>(key: K, value: CategoryDraft[K]) => {
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
        <Breadcrumbs items={["Home", "Admin", "Categories"]} />
        <EmptyState
          title="Admin access requires sign in"
          message="Sign in with an administrator account to manage categories."
          action={{ label: "Sign In", onClick: () => navigate("/account") }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  if (userState.data.role !== "admin") {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Admin", "Categories"]} />
        <ErrorState
          title="Admin access required"
          message="Category management is only available to administrators."
          action={{ label: "View Account", onClick: () => navigate("/account") }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  return (
    <main className="container page admin-catalog-page">
      <Breadcrumbs items={["Home", "Admin", "Categories"]} />
      <section className="admin-orders-hero">
        <div>
          <p className="eyebrow">Admin console</p>
          <h1 className="page-title">Category structure</h1>
          <p>Maintain storefront category labels, URL slugs, icon keys, and child category lists.</p>
        </div>
        <div className="admin-catalog-nav" aria-label="Admin sections">
          <Button variant="ghost" onClick={() => navigate("/admin/products")}>Products</Button>
          <Button onClick={() => navigate("/admin/categories")}>Categories</Button>
          <Button variant="ghost" onClick={() => navigate("/admin/orders")}>Orders</Button>
        </div>
      </section>

      <section className="admin-orders-toolbar" aria-label="Category tools">
        <Button onClick={loadCategories} disabled={categoriesState.loading}>
          <RefreshCw size={16} />
          {categoriesState.loading ? "Refreshing" : "Refresh"}
        </Button>
        <Button onClick={startCreate}>
          <Plus size={16} />
          New Category
        </Button>
        <span className="admin-catalog-count">{categoriesState.data.length} categories</span>
      </section>

      {categoriesState.error && (
        <p className="form-status form-status--error">{categoriesState.error}</p>
      )}
      {formError && <p className="form-status form-status--error">{formError}</p>}
      {formSuccess && <p className="form-status form-status--success">{formSuccess}</p>}

      <section className="admin-catalog-layout">
        <div className="admin-catalog-list" aria-label="Admin category list">
          {!categoriesState.loading && !categoriesState.error && !categoriesState.data.length && (
            <p className="admin-orders-empty">No categories are configured.</p>
          )}
          {categoriesState.data.map((category) => (
            <article className="admin-catalog-row" key={category.id}>
              <div className="admin-catalog-row__main">
                <strong>{category.label}</strong>
                <span>{category.id}</span>
              </div>
              <div className="admin-catalog-row__meta">
                <span>{category.slug}</span>
                <span>{category.icon || "No icon"}</span>
                <span>{category.children?.length ? category.children.join(", ") : "No children"}</span>
              </div>
              <div className="admin-catalog-row__actions">
                <Button variant="ghost" onClick={() => startEdit(category)}>
                  <Edit3 size={16} />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => deleteCategory(category)}
                  disabled={deletingId === category.id}
                >
                  <Trash2 size={16} />
                  {deletingId === category.id ? "Deleting" : "Delete"}
                </Button>
              </div>
            </article>
          ))}
        </div>

        <aside className="admin-catalog-form-card">
          <div className="admin-catalog-form-card__header">
            <div>
              <p className="eyebrow">{editingCategoryId ? "Edit category" : "Create category"}</p>
              <h2>{editingCategoryId || "New category"}</h2>
            </div>
            {editingCategoryId && (
              <Button variant="ghost" onClick={startCreate}>
                <X size={16} />
                Clear
              </Button>
            )}
          </div>
          <form className="admin-catalog-form" onSubmit={submitCategory}>
            <label>
              Label
              <input value={draft.label} onChange={(event) => updateLabel(event.target.value)} required />
            </label>
            <label>
              Slug
              <input
                value={draft.slug}
                onChange={(event) => {
                  setSlugEdited(true);
                  updateDraft("slug", event.target.value);
                }}
                required
              />
            </label>
            <label>
              Icon key
              <input value={draft.icon} onChange={(event) => updateDraft("icon", event.target.value)} placeholder="phone, fashion, game" />
            </label>
            <label>
              Sort order
              <input type="number" value={draft.sortOrder} onChange={(event) => updateDraft("sortOrder", event.target.value)} />
            </label>
            <label className="admin-catalog-form__wide">
              Children
              <input value={draft.children} onChange={(event) => updateDraft("children", event.target.value)} placeholder="phones, cameras" />
            </label>
            <label className="admin-catalog-form__wide">
              Parent
              <select value={draft.parentId} onChange={(event) => updateDraft("parentId", event.target.value)}>
                <option value="">No parent</option>
                {categoriesState.data
                  .filter((category) => category.id !== editingCategoryId)
                  .map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label} ({category.id})
                    </option>
                  ))}
              </select>
            </label>
            <div className="admin-catalog-form__actions">
              <Button type="submit" disabled={saving}>
                <Save size={16} />
                {saving ? "Saving" : editingCategoryId ? "Update Category" : "Create Category"}
              </Button>
            </div>
          </form>
        </aside>
      </section>
    </main>
  );
}
