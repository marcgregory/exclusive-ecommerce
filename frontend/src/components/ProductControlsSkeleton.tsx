export function ProductControlsSkeleton() {
  return (
    <div
      className="product-controls-skeleton"
      data-testid="product-controls-skeleton"
      aria-hidden="true"
    >
      <div className="skeleton skeleton-filter-pill" />
      <div className="skeleton skeleton-filter-pill" />
      <div className="skeleton skeleton-filter-pill" />
      <div className="skeleton skeleton-sort-label" />
      <div className="skeleton skeleton-sort-select" />
    </div>
  );
}
