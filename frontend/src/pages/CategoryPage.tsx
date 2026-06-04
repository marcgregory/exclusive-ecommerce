import { useCallback, useEffect, useState } from "react";
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

type CategoryPageProps = {
  categorySlug?: string;
  searchQuery?: string;
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

export function CategoryPage({ categorySlug, searchQuery, categories, navigate, onAdd, onWishlist }: CategoryPageProps) {
  const isSearch = Boolean(searchQuery && searchQuery.trim());
  const resolvedCategory = isSearch ? undefined : categories.find((entry) => entry.slug === categorySlug);

  const [sort, setSort] = useState<ProductSort>("featured");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ListingState>(emptyState);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    const params = new URLSearchParams();
    if (isSearch) {
      params.set("q", (searchQuery || "").trim());
    } else if (resolvedCategory) {
      params.set("category", resolvedCategory.id);
    }
    if (sort !== "featured") params.set("sort", sort);
    params.set("page", String(page));
    params.set("limit", String(PAGE_LIMIT));
    try {
      const data = await api<ProductsResponse>(`/api/products?${params.toString()}`);
      setState({ products: data.products, total: data.total, page: data.page, loading: false, error: "" });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: getErrorMessage(error) }));
    }
  }, [isSearch, resolvedCategory, searchQuery, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [sort, categorySlug, searchQuery]);

  const title = isSearch ? `Search results for “${searchQuery}”` : resolvedCategory?.label || "All Products";
  const breadcrumbs = isSearch ? ["Home", `Search: ${searchQuery}`] : ["Home", resolvedCategory?.label || "Category"];
  const totalPages = Math.max(1, Math.ceil(state.total / PAGE_LIMIT));

  return (
    <main className="container page">
      <Breadcrumbs items={breadcrumbs} />
      <div className="listing-toolbar">
        <SectionHeader kicker={isSearch ? "Search" : "Category"} title={title} />
        <label className="sort-control">
          <span>Sort by</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as ProductSort)}>
            {PRODUCT_SORTS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {state.loading && <LoadingState title="Loading products" message="We are getting the catalog ready." />}
      {state.error && (
        <ErrorState title="We could not load products" message={state.error} action={{ label: "Try Again", onClick: load }} />
      )}
      {!state.loading && !state.error && state.products.length === 0 && (
        <EmptyState
          title={isSearch ? "No products match your search" : "No products found"}
          message={isSearch ? "Try a different search term." : "There are no products in this category yet."}
          action={{ label: "View All Products", onClick: () => navigate("/") }}
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
              Page {state.page} of {totalPages} · {state.total} product{state.total === 1 ? "" : "s"}
            </span>
            <div className="listing-pagination__actions">
              <Button variant="ghost" disabled={state.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                Previous
              </Button>
              <Button variant="ghost" disabled={state.page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
