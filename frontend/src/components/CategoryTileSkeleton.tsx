export function CategoryTileSkeleton() {
  return (
    <button className="category-tile category-tile--skeleton" aria-hidden="true" disabled>
      <div className="skeleton skeleton-category-icon" />
      <div className="skeleton skeleton-category-label" />
    </button>
  );
}
