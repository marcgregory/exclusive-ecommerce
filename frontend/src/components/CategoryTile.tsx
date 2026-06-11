import { fallbackCategoryIcon, iconMap } from '../lib/icons';
import type { Category, Navigate } from '../types';

type CategoryTileProps = {
  category: Category;
  navigate: Navigate;
  isSkeleton?: boolean;
};

export function CategoryTile({ category, navigate, isSkeleton = false }: CategoryTileProps) {
  // If in skeleton mode, return a skeleton placeholder
  if (isSkeleton) {
    return (
      <button className="category-tile" disabled>
        <div className="skeleton-circle" style={{ width: '34px', height: '34px' }}></div>
        <div
          className="skeleton-text"
          style={{ width: '100%', height: '16px', marginTop: '8px' }}
        ></div>
      </button>
    );
  }

  const Icon = iconMap[category.icon] || fallbackCategoryIcon;
  return (
    <button className="category-tile" onClick={() => navigate(`/category/${category.slug}`)}>
      <Icon size={34} />
      <span>{category.label}</span>
    </button>
  );
}
