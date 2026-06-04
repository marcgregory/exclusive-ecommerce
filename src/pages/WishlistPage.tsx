import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { ProductCard } from "../components/ProductCard";
import { SectionHeader } from "../components/SectionHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import type { AddToCart, AsyncState, Navigate, Product, WishlistResponse } from "../types";

type WishlistPageProps = {
  navigate: Navigate;
  onAdd: AddToCart;
};

export function WishlistPage({ navigate, onAdd }: WishlistPageProps) {
  const [products, setProducts] = useState<AsyncState<Product[]>>({ data: [], loading: true, error: "" });

  const loadWishlist = useCallback(async () => {
    setProducts((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<WishlistResponse>("/api/wishlist");
      setProducts({ data: data.products, loading: false, error: "" });
    } catch (error) {
      setProducts((current) => ({ ...current, loading: false, error: getErrorMessage(error) }));
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  if (products.loading) {
    return <main className="container page"><LoadingState title="Loading wishlist" message="We are checking your wishlist." /></main>;
  }

  if (products.error) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Wishlist"]} />
        <ErrorState
          title="We could not load your wishlist"
          message={products.error}
          action={{ label: "Try Again", onClick: loadWishlist }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  if (!products.data.length) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Wishlist"]} />
        <EmptyState
          title="Your wishlist is empty"
          message="Save products here when you want to compare or buy them later."
          action={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  return (
    <main className="container page">
      <Breadcrumbs items={["Home", "Wishlist"]} />
      <SectionHeader kicker="Wishlist" title={`Wishlist (${products.data.length})`} />
      <div className="product-grid four">{products.data.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} onWishlist={async () => {}} navigate={navigate} />)}</div>
    </main>
  );
}
