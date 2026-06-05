import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { ProductCard } from "../components/ProductCard";
import { SectionHeader } from "../components/SectionHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import {
  PRODUCT_SORTS,
  type AddToCart,
  type AddToWishlist,
  type Category,
  type Navigate,
  type Product,
  type ProductSort,
  type ProductsResponse
} from "../types";

const PAGE_LIMIT = 12;

type ProductFlag = "" | "flash" | "best";

const PRODUCT_FLAGS: { value: ProductFlag; label: string }[] = [
  { value: "", label: "All" },
  { value: "flash", label: "Sale" },
  { value: "best", label: "Best Selling" }
];

const PRODUCT_SORT_VALUES = new Set<ProductSort>(PRODUCT_SORTS.map((sort) => sort.value));
const PRODUCT_FLAG_VALUES = new Set<ProductFlag>(PRODUCT_FLAGS.map((flag) => flag.value));

type CategoryPageProps = {
  categorySlug?: string;
  searchQuery?: string;
  query: URLSearchParams;
  categories: Category[];
  navigate: Navigate;
  onAdd: AddToCart;
  onWishlist: AddToWishlist;
};

type ListingState = {
  products: Product[];
  total: number;
  page: number;
  loading: boolean;
  error: string;
};

const emptyState: ListingState = { products: [], total: 0, page: 1, loading: true, error: "" };

function getSort(query: URLSearchParams): ProductSort {
  const sort = query.get("sort") as ProductSort | null;
  return sort && PRODUCT_SORT_VALUES.has(sort) ? sort : "featured";
}

function getFlag(query: URLSearchParams): ProductFlag {
  const flag = query.get("flag") as ProductFlag | null;
  return flag && PRODUCT_FLAG_VALUES.has(flag) ? flag : "";
}

function getPage(query: URLSearchParams) {
  const page = Number(query.get("page") || 1);
  return Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
}

export function CategoryPage({ categorySlug, searchQuery, query, categories, navigate, onAdd, onWishlist }: CategoryPageProps) {
  const trimmedSearch = (searchQuery || "").trim();
  const isSearch = Boolean(trimmedSearch);
  const resolvedCategory = isSearch ? undefined : categories.find((entry) => entry.slug === categorySlug);
  const sort = getSort(query);
  const flag = getFlag(query);
  const page = getPage(query);
  const [state, setState] = useState<ListingState>(emptyState);
  const basePath = isSearch ? "/search" : `/category/${categorySlug || ""}`;

  const buildListingHref = useCallback((updates: { sort?: ProductSort; flag?: ProductFlag; page?: number }) => {
    const params = new URLSearchParams();
    if (isSearch) params.set("q", trimmedSearch);

    const nextSort = updates.sort ?? sort;
    const nextFlag = updates.flag ?? flag;
    const nextPage = updates.page ?? page;

    if (nextSort !== "featured") params.set("sort", nextSort);
    if (nextFlag) params.set("flag", nextFlag);
    if (nextPage > 1) params.set("page", String(nextPage));

    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  }, [basePath, flag, isSearch, page, sort, trimmedSearch]);

  const activeFilterLabel = PRODUCT_FLAGS.find((option) => option.value === flag)?.label || "All";

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    const params = new URLSearchParams();
    if (isSearch) {
      params.set("q", trimmedSearch);
    } else if (resolvedCategory) {
      params.set("category", resolvedCategory.id);
    }
    if (flag) params.set("flag", flag);
    if (sort !== "featured") params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(PAGE_LIMIT));
    try {
      const data = await api<ProductsResponse>(`/api/products?${params.toString()}`);
      setState({ products: data.products, total: data.total, page: data.page, loading: false, error: "" });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: getErrorMessage(error) }));
    }
  }, [flag, isSearch, resolvedCategory, sort, page, trimmedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const title = isSearch ? `Search results for "${trimmedSearch}"` : resolvedCategory?.label || "All Products";
  const breadcrumbs = isSearch ? ["Home", `Search: ${trimmedSearch}`] : ["Home", resolvedCategory?.label || "Category"];
  const totalPages = Math.max(1, Math.ceil(state.total / PAGE_LIMIT));
  const hasActiveControls = Boolean(flag || sort !== "featured" || page > 1);
  const loadingMessage = isSearch
    ? `Finding products that match "${trimmedSearch}".`
    : `Loading ${resolvedCategory?.label || "products"}.`;
  const emptyMessage = useMemo(() => {
    if (isSearch && flag) return `No ${activeFilterLabel.toLowerCase()} products match "${trimmedSearch}".`;
    if (isSearch) return "Try a different search term or clear your filters.";
    if (flag) return `No ${activeFilterLabel.toLowerCase()} products are available in this category yet.`;
    return "There are no products in this category yet.";
  }, [activeFilterLabel, flag, isSearch, trimmedSearch]);
  const clearFilters = () => navigate(buildListingHref({ sort: "featured", flag: "", page: 1 }));
  const setFilter = (nextFlag: ProductFlag) => navigate(buildListingHref({ flag: nextFlag, page: 1 }));
  const setSort = (nextSort: ProductSort) => navigate(buildListingHref({ sort: nextSort, page: 1 }));
  const setPage = (nextPage: number) => navigate(buildListingHref({ page: nextPage }));

  return (
    <main className="container page">
      <Breadcrumbs items={breadcrumbs} />
      <div className="listing-toolbar">
        <SectionHeader kicker={isSearch ? "Search" : "Category"} title={title} />
        <div className="listing-controls">
          <div className="filter-control" aria-label="Product filters">
            {PRODUCT_FLAGS.map((option) => (
              <button
                key={option.value || "all"}
                type="button"
                className={flag === option.value ? "is-active" : ""}
                aria-pressed={flag === option.value}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <label className="sort-control">
            <span>Sort by</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as ProductSort)}>
              {PRODUCT_SORTS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {state.loading && <LoadingState title="Loading products" message={loadingMessage} />}
      {state.error && (
        <ErrorState title="We could not load products" message={state.error} action={{ label: "Try Again", onClick: load }} />
      )}
      {!state.loading && !state.error && state.products.length === 0 && (
        <EmptyState
          title={isSearch ? "No products match your search" : "No products found"}
          message={emptyMessage}
          action={hasActiveControls ? { label: "Clear Filters", onClick: clearFilters } : { label: "View All Products", onClick: () => navigate("/") }}
          secondaryAction={hasActiveControls ? { label: "View All Products", onClick: () => navigate("/") } : undefined}
        />
      )}
      {!state.loading && !state.error && state.products.length > 0 && (
        <>
          <div className="product-grid four">
            {state.products.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={onAdd} onWishlist={onWishlist} navigate={navigate} />
            ))}
          </div>
          <div className="listing-pagination">
            <span>
              Page {state.page} of {totalPages} - {state.total} product{state.total === 1 ? "" : "s"}
            </span>
            <div className="listing-pagination__actions">
              <Button variant="ghost" disabled={state.page <= 1} onClick={() => setPage(Math.max(1, state.page - 1))}>
                Previous
              </Button>
              <Button variant="ghost" disabled={state.page >= totalPages} onClick={() => setPage(Math.min(totalPages, state.page + 1))}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
