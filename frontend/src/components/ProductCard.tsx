import { Eye, Heart } from "lucide-react";
import { formatMoney } from "../lib/format";
import type { AddToCart, AddToWishlist, Navigate, Product } from "../types";
import { ProductVisual } from "./ProductVisual";
import { Stars } from "./Stars";

type ProductCardProps = {
  product: Product;
  discount?: boolean;
  onAdd: AddToCart;
  onWishlist: AddToWishlist;
  navigate: Navigate;
  showWishlistButton?: boolean;
  secondaryAction?: React.ReactNode;
};

export function ProductCard({ product, onAdd, onWishlist, navigate, showWishlistButton = true, secondaryAction }: ProductCardProps) {
  const isOutOfStock = product.stockStatus === "Out of Stock";
  return (
    <article className="product-card">
      <div className="product-card__media">
        {product.discountPercent > 0 && <span className="discount">-{product.discountPercent}%</span>}
        {isOutOfStock && <span className="out-badge">OUT OF STOCK</span>}
        {product.isNew && !isOutOfStock && <span className="new-badge">NEW</span>}
        <div className="card-tools">
          {showWishlistButton && (
            <button onClick={() => onWishlist(product.id)} aria-label={`Wishlist ${product.name}`}><Heart size={18} /></button>
          )}
          <button onClick={() => navigate(`/product/${product.id}`)} aria-label={`View ${product.name}`}><Eye size={18} /></button>
        </div>
        <ProductVisual type={product.image} />
        <button className="add-cart" onClick={() => onAdd(product.id)} disabled={isOutOfStock}>
          {isOutOfStock ? "Out of stock" : "Add To Cart"}
        </button>
      </div>
      <button className="product-card__title" onClick={() => navigate(`/product/${product.id}`)}>{product.name}</button>
      <div className="product-card__price">
        <strong>{formatMoney(product.price)}</strong>
        {product.originalPrice > 0 && <del>{formatMoney(product.originalPrice)}</del>}
      </div>
      <div className="product-card__rating"><Stars value={product.rating} /><span>({product.reviewCount})</span></div>
      {secondaryAction && <div className="product-card__actions">{secondaryAction}</div>}
    </article>
  );
}
