import { fallbackCategoryIcon, iconMap } from "../lib/icons";
import type { Category, Navigate } from "../types";

type CategoryTileProps = {
  category: Category;
  navigate: Navigate;
};

export function CategoryTile({ category, navigate }: CategoryTileProps) {
  const Icon = iconMap[category.icon] || fallbackCategoryIcon;
  return (
    <button className="category-tile" onClick={() => navigate(`/category/${category.slug}`)}>
      <Icon size={34} />
      <span>{category.label}</span>
    </button>
  );
}
