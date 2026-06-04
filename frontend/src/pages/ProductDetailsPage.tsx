import { Heart, ShieldCheck, Truck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
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
import type { AddToCart, AddToWishlist, AsyncState, Navigate, ProductDetailResponse } from "../types";

type ProductDetailsPageProps = {
  id?: string;
  navigate: Navigate;
  onAdd: AddToCart;
  onWishlist: AddToWishlist;
};

export function ProductDetailsPage({ id, navigate, onAdd, onWishlist }: ProductDetailsPageProps) {
  const [productState, setProductState] = useState<AsyncState<ProductDetailResponse | null>>({ data: null, loading: true, error: "" });
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [actionError, setActionError] = useState("");

  const loadProduct = useCallback(async () => {
    if (!id) {
      setProductState({ data: null, loading: false, error: "Product not found" });
      return;
    }

    setProductState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<ProductDetailResponse>(`/api/products/${id}`);
      setProductState({ data, loading: false, error: "" });
    } catch (error) {
      setProductState({ data: null, loading: false, error: getErrorMessage(error) });
    }
  }, [id]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  if (productState.loading) {
    return <main className="container page"><LoadingState title="Loading product" message="We are getting the product details." /></main>;
  }

  if (productState.error || !productState.data) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Product"]} />
        <ErrorState
          title="We could not load this product"
          message={productState.error || "Product not found"}
          action={{ label: "Try Again", onClick: loadProduct }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  const { product, related } = productState.data;
  const isOutOfStock = product.stockStatus === "Out of Stock";
  const requiresColor = product.colors.length > 0;
  const requiresSize = product.sizes.length > 0;
  const canAddToCart = !isOutOfStock && (!requiresColor || selectedColor) && (!requiresSize || selectedSize);

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
    }
    try {
      setActionError("");
      await onAdd(product.id, quantity, selectedColor, selectedSize);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const addToWishlist = async () => {
    try {
      setActionError("");
      await onWishlist(product.id);
    } catch (error) {
      setActionError(getErrorMessage(error));
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
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Color ${color}`}
                  aria-pressed={color === selectedColor}
                />
              ))}
            </div>
          )}
          {requiresSize && (
            <div className="choice-row">
              <span>Size:</span>
              {product.sizes.map((entry) => (
                <button key={entry} className={entry === selectedSize ? "selected size" : "size"} onClick={() => setSelectedSize(entry)}>{entry}</button>
              ))}
            </div>
          )}
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
        <div className="product-grid four">{related.map((entry) => <ProductCard key={entry.id} product={entry} onAdd={onAdd} onWishlist={onWishlist} navigate={navigate} />)}</div>
      </section>
    </main>
  );
}
