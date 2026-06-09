import { Heart, ShieldCheck, Truck } from "lucide-react";
import { useState } from "react";
import {
  useAddCartItemMutation,
  useAddWishlistProductMutation,
  useGetProductDetailQuery,
} from "../api/ecommerceApi";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { ErrorState, LoadingState } from "../components/StateViews";
import { ProductCard } from "../components/ProductCard";
import { ProductVisual } from "../components/ProductVisual";
import { QuantityStepper } from "../components/QuantityStepper";
import { SectionHeader } from "../components/SectionHeader";
import { Stars } from "../components/Stars";
import { getErrorMessage } from "../lib/errors";
import { formatMoney } from "../lib/format";
import { getRtkErrorMessage, getRtkStatus } from "../lib/rtkErrors";
import type { AddToCart, AddToWishlist, Navigate } from "../types";

type ProductDetailsPageProps = {
  id?: string;
  navigate: Navigate;
  onAdd: AddToCart;
  onWishlist: AddToWishlist;
  wishlistProductIds: string[];
};

function getActionErrorMessage(error: unknown) {
  const rtkMessage = getRtkErrorMessage(error);
  return rtkMessage && rtkMessage !== "Request failed" ? rtkMessage : getErrorMessage(error);
}

export function ProductDetailsPage({ id, navigate, onAdd, onWishlist, wishlistProductIds }: ProductDetailsPageProps) {
  const productQuery = useGetProductDetailQuery(id || "", { skip: !id });
  const [addCartItem] = useAddCartItemMutation();
  const [addWishlistProduct] = useAddWishlistProductMutation();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [actionError, setActionError] = useState("");

  const productError = !id ? "Product not found" : getRtkErrorMessage(productQuery.error);

  if (productQuery.isLoading) {
    return <main className="container page"><LoadingState title="Loading product" message="We are getting the product details." /></main>;
  }

  if (productError || !productQuery.data) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Product"]} />
        <ErrorState
          title="We could not load this product"
          message={productError || "Product not found"}
          action={{ label: "Try Again", onClick: productQuery.refetch }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  const { product, related, variants = [] } = productQuery.data;
  const isOutOfStock = product.stockStatus === "Out of Stock";
  const requiresColor = product.colors.length > 0;
  const requiresSize = product.sizes.length > 0;
  const hasVariantStock = variants.length > 0;
  const selectedVariant = variants.find(
    (variant) =>
      variant.color === (selectedColor || "") &&
      variant.size === (selectedSize || ""),
  );
  const hasRequiredSelections = (!requiresColor || selectedColor) && (!requiresSize || selectedSize);
  const hasInStockVariant = !hasVariantStock || Boolean(selectedVariant && selectedVariant.stock > 0);
  const canAddToCart = !isOutOfStock && hasRequiredSelections && hasInStockVariant;

  const hasInStockCombo = (color: string, size: string) =>
    !hasVariantStock ||
    variants.some(
      (variant) =>
        variant.color === color &&
        variant.size === size &&
        variant.stock > 0,
    );

  const colorDisabled = (color: string) => {
    if (!hasVariantStock) return false;
    if (selectedSize || !requiresSize) return !hasInStockCombo(color, selectedSize || "");
    return !variants.some((variant) => variant.color === color && variant.stock > 0);
  };

  const sizeDisabled = (size: string) => {
    if (!hasVariantStock) return false;
    if (selectedColor || !requiresColor) return !hasInStockCombo(selectedColor || "", size);
    return !variants.some((variant) => variant.size === size && variant.stock > 0);
  };

  const selectColor = (color: string) => {
    setActionError("");
    setSelectedColor(color);
    if (selectedSize && !hasInStockCombo(color, selectedSize)) {
      setSelectedSize("");
    }
  };

  const selectSize = (size: string) => {
    setActionError("");
    setSelectedSize(size);
    if (selectedColor && !hasInStockCombo(selectedColor, size)) {
      setSelectedColor("");
    }
  };

  const variantFeedback = (() => {
    if (isOutOfStock) return "This product is currently out of stock.";
    if (!hasVariantStock) return product.stockStatus;
    if (!hasRequiredSelections) {
      if (requiresColor && requiresSize) return "Choose a colour and size to check stock.";
      if (requiresColor) return "Choose a colour to check stock.";
      if (requiresSize) return "Choose a size to check stock.";
    }
    if (!selectedVariant || selectedVariant.stock <= 0) return "Selected combination is unavailable.";
    const sku = selectedVariant.sku ? `SKU: ${selectedVariant.sku}` : "SKU not assigned";
    return `${sku} | ${selectedVariant.stock} in stock`;
  })();

  const addToCart = async () => {
    if (!canAddToCart) {
      if (requiresColor && !selectedColor) {
        setActionError("Please choose a color before adding to cart.");
        return;
      }
      if (requiresSize && !selectedSize) {
        setActionError("Please choose a size before adding to cart.");
        return;
      }
      if (hasVariantStock) {
        setActionError("Please choose an available in-stock variant before adding to cart.");
        return;
      }
    }
    try {
      setActionError("");
      await addCartItem({ productId: product.id, quantity, selectedColor, selectedSize }).unwrap();
    } catch (error) {
      if (getRtkStatus(error) === 401) {
        navigate("/account");
        return;
      }
      setActionError(getActionErrorMessage(error));
    }
  };

  const addToWishlist = async () => {
    try {
      setActionError("");
      await addWishlistProduct(product.id).unwrap();
    } catch (error) {
      if (getRtkStatus(error) === 401) {
        navigate("/account");
        return;
      }
      setActionError(getActionErrorMessage(error));
    }
  };

  return (
    <main className="container page product-detail-page">
      <Breadcrumbs items={["Account", product.category, product.name]} />
      {actionError && <p className="form-status form-status--error">{actionError}</p>}
      <section className="product-detail">
        <div className="thumbs">{[product.image, "gamepad-black", "gamepad-red", "default"].map((img, index) => <button key={`${img}-${index}`}><ProductVisual type={img} /></button>)}</div>
        <div className="main-product-image"><ProductVisual type={product.image} large /></div>
        <div className="product-info">
          <h1>{product.name}</h1>
          <div className="review-line"><Stars value={product.rating} /><span>({product.reviewCount} Reviews)</span><i /> <strong className={isOutOfStock ? "stock-out" : "stock-in"}>{isOutOfStock ? "Out of stock" : product.stockStatus}</strong></div>
          <p className="detail-price">{formatMoney(product.price)}</p>
          <p className="detail-copy">{product.description}</p>
          <hr />
          {requiresColor && (
            <div className="choice-row">
              <span>Colours:</span>
              {product.colors.map((color) => (
                <button
                  key={color}
                  className={color === selectedColor ? "swatch selected" : "swatch"}
                  style={{ background: color }}
                  onClick={() => selectColor(color)}
                  aria-label={`Color ${color}`}
                  aria-pressed={color === selectedColor}
                  disabled={colorDisabled(color)}
                  title={colorDisabled(color) ? "Unavailable with the selected size" : `Color ${color}`}
                />
              ))}
            </div>
          )}
          {requiresSize && (
            <div className="choice-row">
              <span>Size:</span>
              {product.sizes.map((entry) => (
                <button
                  key={entry}
                  className={entry === selectedSize ? "selected size" : "size"}
                  onClick={() => selectSize(entry)}
                  disabled={sizeDisabled(entry)}
                  title={sizeDisabled(entry) ? "Unavailable with the selected colour" : `Size ${entry}`}
                >
                  {entry}
                </button>
              ))}
            </div>
          )}
          <p className={canAddToCart ? "variant-feedback variant-feedback--available" : "variant-feedback"}>
            {variantFeedback}
          </p>
          <div className="buy-row">
            <QuantityStepper value={quantity} onChange={setQuantity} />
            <Button onClick={addToCart} disabled={!canAddToCart}>{isOutOfStock ? "Out of stock" : "Buy Now"}</Button>
            <button className="wishlist-square" onClick={addToWishlist} aria-label="Add to wishlist"><Heart /></button>
          </div>
          <div className="delivery-box"><div><Truck /><div><h4>Free Delivery</h4><p>Enter your postal code for Delivery Availability</p></div></div><div><ShieldCheck /><div><h4>Return Delivery</h4><p>Free 30 Days Delivery Returns. Details</p></div></div></div>
        </div>
      </section>
      <section className="section">
        <SectionHeader kicker="Related Item" title="" />
        <div className="product-grid four">{related.map((entry) => <ProductCard key={entry.id} product={entry} onAdd={onAdd} onWishlist={onWishlist} navigate={navigate} isInWishlist={wishlistProductIds.includes(entry.id)} />)}</div>
      </section>
    </main>
  );
}
