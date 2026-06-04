import { Trash2, ShoppingCart } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { ProductCard } from "../components/ProductCard";
import { SectionHeader } from "../components/SectionHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import type { AddToCart, AsyncState, AuthStatus, Navigate, Product, RefreshCart, WishlistResponse } from "../types";

type WishlistPageProps = {
  authStatus: AuthStatus;
  navigate: Navigate;
  onAdd: AddToCart;
  refreshCart: RefreshCart;
  refreshWishlist: () => Promise<void>;
};

export function WishlistPage({ authStatus, navigate, onAdd, refreshCart, refreshWishlist }: WishlistPageProps) {
  const [products, setProducts] = useState<AsyncState<Product[]>>({ data: [], loading: true, error: "" });
  const [actionError, setActionError] = useState("");
  const [pendingProductId, setPendingProductId] = useState("");

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
    if (pendingProductId) return;
    try {
      setActionError("");
      setPendingProductId(productId);
      setProducts((current) => ({ ...current, data: current.data.filter((product) => product.id !== productId) }));
      await api(`/api/wishlist/${productId}`, { method: "DELETE" });
      await refreshWishlist();
    } catch (error) {
      setActionError(getErrorMessage(error));
      loadWishlist();
    } finally {
      setPendingProductId("");
    }
  };

  const handleMoveToCart = async (product: Product) => {
    if (pendingProductId) return;
    try {
      setActionError("");
      setPendingProductId(product.id);
      // Default to the first available color/size so the move-to-cart works
      // without forcing the user back to the product page. They can adjust
      // the variant from the cart or product page later.
      await api("/api/cart/items", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
          selectedColor: product.colors[0] ?? "",
          selectedSize: product.sizes[0] ?? ""
        })
      });
      await api(`/api/wishlist/${product.id}`, { method: "DELETE" });
      setProducts((current) => ({ ...current, data: current.data.filter((entry) => entry.id !== product.id) }));
      await Promise.all([refreshCart(), refreshWishlist()]);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setPendingProductId("");
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
            onWishlist={handleRemove}
            showWishlistButton={false}
            secondaryAction={
              <div className="card-actions">
                <Button onClick={() => handleMoveToCart(product)} disabled={pendingProductId === product.id || product.stockStatus === "Out of Stock"}>
                  <ShoppingCart size={16} /> {product.stockStatus === "Out of Stock" ? "Out of stock" : "Move to cart"}
                </Button>
                <Button variant="ghost" onClick={() => handleRemove(product.id)} disabled={pendingProductId === product.id} aria-label={`Remove ${product.name}`}>
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
