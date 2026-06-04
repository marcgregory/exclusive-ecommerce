import { Breadcrumbs } from "../components/Breadcrumbs";
import { EmptyState } from "../components/StateViews";
import { ProductCard } from "../components/ProductCard";
import { SectionHeader } from "../components/SectionHeader";
import type { AddToCart, AddToWishlist, Category, Navigate, Product } from "../types";

type CategoryPageProps = {
  categorySlug?: string;
  categories: Category[];
  products: Product[];
  navigate: Navigate;
  onAdd: AddToCart;
  onWishlist: AddToWishlist;
};

export function CategoryPage({ categorySlug, categories, products, navigate, onAdd, onWishlist }: CategoryPageProps) {
  const category = categories.find((entry) => entry.slug === categorySlug);
  const filtered = products.filter((product) => !category || product.category === category.id);

  return (
    <main className="container page">
      <Breadcrumbs items={["Home", category?.label || "Category"]} />
      <SectionHeader kicker="Category" title={category?.label || "All Products"} />
      {filtered.length > 0 ? (
        <div className="product-grid four">{filtered.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} onWishlist={onWishlist} navigate={navigate} />)}</div>
      ) : (
        <EmptyState title="No products found" message="There are no products in this category yet." action={{ label: "View All Products", onClick: () => navigate("/") }} />
      )}
    </main>
  );
}
