import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useGetFilteredProductsQuery } from '../api/ecommerceApi';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '../components/Button';
import { ProductCard } from '../components/ProductCard';
import { ProductControlsSkeleton } from '../components/ProductControlsSkeleton';
import { ProductGridSkeleton } from '../components/ProductGridSkeleton';
import { SectionHeader } from '../components/SectionHeader';
import { EmptyState, ErrorState } from '../components/StateViews';
import { getRtkErrorMessage } from '../lib/rtkErrors';
import {
  PRODUCT_SORTS,
  type AddToCart,
  type AddToWishlist,
  type Category,
  type Navigate,
  type ProductSort,
} from '../types';

const PAGE_LIMIT = 12;

type ProductFlag = '' | 'flash' | 'best';

const PRODUCT_FLAGS: { value: ProductFlag; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'flash', label: 'Sale' },
  { value: 'best', label: 'Best Selling' },
];

const PRODUCT_SORT_VALUES = new Set<ProductSort>(PRODUCT_SORTS.map((sort) => sort.value));
const PRODUCT_FLAG_VALUES = new Set<ProductFlag>(PRODUCT_FLAGS.map((flag) => flag.value));

function clampSkeletonCount(calculatedCount: number) {
  return Math.max(1, Math.min(calculatedCount, PAGE_LIMIT));
}

function firstKnownCount(...counts: Array<number | undefined>) {
  return counts.find((count) => Number.isFinite(count) && count > 0);
}

type CategoryPageProps = {
  categorySlug?: string;
  searchQuery?: string;
  query: URLSearchParams;
  categories: Category[];
  categoriesLoading?: boolean;
  navigate: Navigate;
  onAdd: AddToCart;
  onWishlist: AddToWishlist;
  wishlistProductIds: string[];
};

function getSort(query: URLSearchParams): ProductSort {
  const sort = query.get('sort') as ProductSort | null;
  return sort && PRODUCT_SORT_VALUES.has(sort) ? sort : 'featured';
}

function getFlag(query: URLSearchParams): ProductFlag {
  const flag = query.get('flag') as ProductFlag | null;
  return flag && PRODUCT_FLAG_VALUES.has(flag) ? flag : '';
}

function getPage(query: URLSearchParams) {
  const page = Number(query.get('page') || 1);
  return Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
}

export function CategoryPage({
  categorySlug,
  searchQuery,
  query,
  categories,
  categoriesLoading = false,
  navigate,
  onAdd,
  onWishlist,
  wishlistProductIds,
}: CategoryPageProps) {
  const trimmedSearch = (searchQuery || '').trim();
  const isSearch = Boolean(trimmedSearch);
  const resolvedCategory = isSearch
    ? undefined
    : categories.find((entry) => entry.slug === categorySlug);
  const sort = getSort(query);
  const flag = getFlag(query);
  const page = getPage(query);
  const basePath = isSearch ? '/search' : `/category/${categorySlug || ''}`;

  const filters = useMemo(() => {
    const filters: Record<string, unknown> = { limit: PAGE_LIMIT, page };
    if (isSearch) {
      filters.q = trimmedSearch;
    } else if (resolvedCategory) {
      filters.category = resolvedCategory.id;
    }
    if (flag) filters.flag = flag;
    if (sort !== 'featured') filters.sort = sort;
    return filters;
  }, [flag, isSearch, page, resolvedCategory, sort, trimmedSearch]);

  const shouldSkipProducts = !isSearch && Boolean(categorySlug) && !resolvedCategory;
  const { data, isLoading, error, isFetching, refetch } = useGetFilteredProductsQuery(filters, {
    skip: shouldSkipProducts,
  });

  const buildListingHref = useCallback(
    (updates: { sort?: ProductSort; flag?: ProductFlag; page?: number }) => {
      const params = new URLSearchParams();
      if (isSearch) params.set('q', trimmedSearch);

      const nextSort = updates.sort ?? sort;
      const nextFlag = updates.flag ?? flag;
      const nextPage = updates.page ?? page;

      if (nextSort !== 'featured') params.set('sort', nextSort);
      if (nextFlag) params.set('flag', nextFlag);
      if (nextPage > 1) params.set('page', String(nextPage));

      const queryString = params.toString();
      return queryString ? `${basePath}?${queryString}` : basePath;
    },
    [basePath, flag, isSearch, page, sort, trimmedSearch]
  );

  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? page;
  const shouldShowControlsSkeleton = categoriesLoading;
  const shouldShowGridSkeleton = shouldSkipProducts || isLoading || isFetching;
  const previousProductsCount = useRef<number | undefined>(undefined);
  const categoryProductCount = !isSearch ? resolvedCategory?.productCount : undefined;
  const skeletonCount = clampSkeletonCount(
    firstKnownCount(
      products.length,
      previousProductsCount.current,
      categoryProductCount,
      PAGE_LIMIT
    ) ?? PAGE_LIMIT
  );
  const errorMessage = error ? getRtkErrorMessage(error) : '';

  useEffect(() => {
    if (!shouldShowGridSkeleton && products.length > 0) {
      previousProductsCount.current = products.length;
    }
  }, [products.length, shouldShowGridSkeleton]);

  const title = isSearch
    ? `Search results for "${trimmedSearch}"`
    : resolvedCategory?.label || 'All Products';
  const breadcrumbs = isSearch
    ? ['Home', `Search: ${trimmedSearch}`]
    : ['Home', resolvedCategory?.label || 'Category'];
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const hasActiveControls = Boolean(flag || sort !== 'featured' || page > 1);
  const activeFilterLabel = PRODUCT_FLAGS.find((option) => option.value === flag)?.label || 'All';
  const emptyMessage = useMemo(() => {
    if (isSearch && flag)
      return `No ${activeFilterLabel.toLowerCase()} products match "${trimmedSearch}".`;
    if (isSearch) return 'Try a different search term or clear your filters.';
    if (flag)
      return `No ${activeFilterLabel.toLowerCase()} products are available in this category yet.`;
    return 'There are no products in this category yet.';
  }, [activeFilterLabel, flag, isSearch, trimmedSearch]);

  const clearFilters = () => navigate(buildListingHref({ sort: 'featured', flag: '', page: 1 }));
  const setFilter = (nextFlag: ProductFlag) =>
    navigate(buildListingHref({ flag: nextFlag, page: 1 }));
  const setSort = (nextSort: ProductSort) =>
    navigate(buildListingHref({ sort: nextSort, page: 1 }));
  const setPage = (nextPage: number) => navigate(buildListingHref({ page: nextPage }));

  return (
    <main className="container page">
      <Breadcrumbs items={breadcrumbs} />
      <div className="listing-toolbar">
        <SectionHeader kicker={isSearch ? 'Search' : 'Category'} title={title} />
        {shouldShowControlsSkeleton ? (
          <ProductControlsSkeleton />
        ) : (
          <div className="listing-controls">
            <div className="filter-control" aria-label="Product filters">
              {PRODUCT_FLAGS.map((option) => (
                <button
                  key={option.value || 'all'}
                  type="button"
                  className={flag === option.value ? 'is-active' : ''}
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
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {!shouldShowGridSkeleton && errorMessage && (
        <ErrorState
          title="We could not load products"
          message={errorMessage}
          action={{ label: 'Try Again', onClick: refetch }}
        />
      )}
      {!shouldShowGridSkeleton && !errorMessage && products.length === 0 && (
        <EmptyState
          title={isSearch ? 'No products match your search' : 'No products found'}
          message={emptyMessage}
          action={
            hasActiveControls
              ? { label: 'Clear Filters', onClick: clearFilters }
              : { label: 'View All Products', onClick: () => navigate('/') }
          }
          secondaryAction={
            hasActiveControls
              ? { label: 'View All Products', onClick: () => navigate('/') }
              : undefined
          }
        />
      )}
      {shouldShowGridSkeleton ? (
        <ProductGridSkeleton count={skeletonCount} />
      ) : (
        <div className="product-grid four">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={onAdd}
              onWishlist={onWishlist}
              navigate={navigate}
              isInWishlist={wishlistProductIds.includes(product.id)}
            />
          ))}
        </div>
      )}
      {!shouldShowGridSkeleton && !errorMessage && products.length > 0 && (
        <div className="listing-pagination">
          <span>
            Page {currentPage} of {totalPages} - {total} product{total === 1 ? '' : 's'}
          </span>
          <div className="listing-pagination__actions">
            <Button
              variant="ghost"
              disabled={currentPage <= 1}
              onClick={() => setPage(Math.max(1, currentPage - 1))}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
