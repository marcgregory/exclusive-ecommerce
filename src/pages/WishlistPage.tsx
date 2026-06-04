import { Trash2, ShoppingCart } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { ProductCard } from "../components/ProductCard";
import { SectionHeader } from "../components/SectionHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import type { AddToCart, AsyncState, AuthStatus, Navigate, Product, RemoveFromWishlist, WishlistResponse } from "../types";

type WishlistPageProps = {
  authStatus: AuthStatus;
  navigate: Navigate;
  onAdd: AddToCart;
  onRemove: RemoveFromWishlist;
  onMoveToCart: RemoveFromWishlist;
};

export function WishlistPage({ authStatus, navigate, onAdd, onRemove, onMoveToCart }: WishlistPageProps) {
  const [products, setProducts] = useState<AsyncState<Product[]>>({ data: [], loading: true, error: "" });
  const [actionError, setActionError] = useState("");

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
    if (authStatus !== "authenticated") return;
    loadWishlist();
  }, [authStatus, loadWishlist]);

  const handleRemove = async (productId: string) => {
    try {
      setActionError("");
      setProducts((current) => ({ ...current, data: current.data.filter((product) => product.id !== productId) }));
      await onRemove(productId);
    } catch (error) {
      setActionError(getErrorMessage(error));
      loadWishlist();
    }
  };

  const handleMoveToCart = async (productId: string) => {
    try {
      setActionError("");
      await onMoveToCart(productId);
      setProducts((current) => ({ ...current, data: current.data.filter((product) => product.id !== productId) }));
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  if (authStatus === "checking") {
    return <main className="container page"><LoadingState title="Loading wishlist" message="We are checking your wishlist." /></main>;
  }

  if (authStatus === "guest") {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Wishlist"]} />
        <EmptyState
          title="Sign in to view your wishlist"
          message="Save products to your account and keep them ready for later."
          action={{ label: "Sign In or Register", onClick: () => navigate("/account") }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

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
      {actionError && <p className="form-status form-status--error">{actionError}</p>}
      <div className="product-grid four">
        {products.data.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            navigate={navigate}
            onAdd={onAdd}
            onWishlist={async () => { handleRemove(product.id); }}
            showWishlistButton={false}
            secondaryAction={
              <div className="card-actions">
                <Button onClick={() => handleMoveToCart(product.id)}>
                  <ShoppingCart size={16} /> Move to cart
                </Button>
                <Button variant="ghost" onClick={() => handleRemove(product.id)} aria-label={`Remove ${product.name}`}>
                  <Trash2 size={16} /> Remove
                </Button>
              </div>
            }
          />
        ))}
      </div>
    </main>
  );
}
