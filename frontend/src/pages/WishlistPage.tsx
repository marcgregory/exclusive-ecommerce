import { Trash2, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useAddCartItemMutation,
  useDeleteWishlistProductMutation,
  useGetWishlistQuery,
  useLazyGetProductDetailQuery,
} from "../api/ecommerceApi";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { ProductCard } from "../components/ProductCard";
import { SectionHeader } from "../components/SectionHeader";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import { getQuickAddSelection, requiresVariantSelection } from "../lib/productVariants";
import { getRtkErrorMessage } from "../lib/rtkErrors";
import type { AddToCart, AuthStatus, Navigate, Product, RefreshCart } from "../types";

type WishlistPageProps = {
  authStatus: AuthStatus;
  navigate: Navigate;
  onAdd: AddToCart;
  refreshCart: RefreshCart;
  refreshWishlist: () => Promise<void>;
};

export function WishlistPage({ authStatus, navigate, onAdd, refreshCart, refreshWishlist }: WishlistPageProps) {
  const wishlistQuery = useGetWishlistQuery(undefined, { skip: authStatus !== "authenticated" });
  const [getProductDetail] = useLazyGetProductDetailQuery();
  const [addCartItem] = useAddCartItemMutation();
  const [deleteWishlistProduct] = useDeleteWishlistProductMutation();
  const [products, setProducts] = useState<Product[]>([]);
  const [actionError, setActionError] = useState("");
  const [pendingProductId, setPendingProductId] = useState("");

  const getMutationErrorMessage = (error: unknown) => {
    const rtkMessage = getRtkErrorMessage(error);
    if (rtkMessage && rtkMessage !== "Request failed") return rtkMessage;
    return getErrorMessage(error, rtkMessage || "Request failed");
  };

  useEffect(() => {
    if (wishlistQuery.data) {
      setProducts(wishlistQuery.data.products);
    }
  }, [wishlistQuery.data]);

  const loadWishlist = () => {
    wishlistQuery.refetch();
  };

  const handleRemove = async (productId: string) => {
    if (pendingProductId) return;
    try {
      setActionError("");
      setPendingProductId(productId);
      setProducts((current) => current.filter((product) => product.id !== productId));
      await deleteWishlistProduct(productId).unwrap();
      await refreshWishlist();
    } catch (error) {
      setActionError(getMutationErrorMessage(error));
      setProducts(wishlistQuery.data?.products ?? []);
      wishlistQuery.refetch();
    } finally {
      setPendingProductId("");
    }
  };

  const handleMoveToCart = async (product: Product) => {
    if (pendingProductId) return;
    try {
      setActionError("");
      setPendingProductId(product.id);
      let selection = getQuickAddSelection(product);

      if (!selection && requiresVariantSelection(product)) {
        const data = await getProductDetail(product.id).unwrap();
        selection = getQuickAddSelection(data.product, data.variants);

        if (!selection) {
          setActionError(`Choose available options for ${product.name} before moving it to cart.`);
          navigate(`/product/${product.id}`);
          return;
        }
      }

      await addCartItem({
        productId: product.id,
        quantity: 1,
        selectedColor: selection?.selectedColor ?? "",
        selectedSize: selection?.selectedSize ?? ""
      }).unwrap();
      await deleteWishlistProduct(product.id).unwrap();
      setProducts((current) => current.filter((entry) => entry.id !== product.id));
      await Promise.all([refreshCart(), refreshWishlist()]);
    } catch (error) {
      setActionError(getMutationErrorMessage(error));
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

  if (wishlistQuery.isLoading || (!wishlistQuery.data && wishlistQuery.isFetching)) {
    return <main className="container page"><LoadingState title="Loading wishlist" message="We are checking your wishlist." /></main>;
  }

  const wishlistError = getRtkErrorMessage(wishlistQuery.error);

  if (wishlistError || (!wishlistQuery.data && wishlistQuery.isError)) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Wishlist"]} />
        <ErrorState
          title="We could not load your wishlist"
          message={wishlistError || "Request failed"}
          action={{ label: "Try Again", onClick: loadWishlist }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  if (!products.length) {
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
      <SectionHeader kicker="Wishlist" title={`Wishlist (${products.length})`} />
      {actionError && <p className="form-status form-status--error">{actionError}</p>}
      <div className="product-grid four">
        {products.map((product) => (
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
