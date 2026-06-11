import { Eye, Heart } from 'lucide-react';
import { formatMoney } from '../lib/format';
import { getQuickAddSelection, requiresVariantSelection } from '../lib/productVariants';
import { resolveProductImage } from '../lib/productUtils';
import type { AddToCart, AddToWishlist, Navigate, Product, ProductVariant } from '../types';
import { ProductVisual } from './ProductVisual';
import { Stars } from './Stars';

type ProductCardProps = {
  product: Product;
  variants?: ProductVariant[];
  discount?: boolean;
  onAdd: AddToCart;
  onWishlist: AddToWishlist;
  navigate: Navigate;
  showWishlistButton?: boolean;
  secondaryAction?: React.ReactNode;
  isInWishlist?: boolean;
  isSkeleton?: boolean;
};

export function ProductCard({
  product,
  variants,
  onAdd,
  onWishlist,
  navigate,
  showWishlistButton = true,
  secondaryAction,
  isInWishlist = false,
  isSkeleton = false,
}: ProductCardProps) {
  // If in skeleton mode, return a skeleton placeholder
  if (isSkeleton) {
    return (
      <article className="product-card">
        <div className="product-card__media">
          <div className="product-visual__skeleton">
            <div className="product-visual__skeleton-wave" />
          </div>
          <div className="card-tools">
            <button className="skeleton-button" disabled aria-label="Wishlist">
              <Heart size={18} fill="none" stroke="currentColor" />
            </button>
            <button className="skeleton-button" disabled aria-label="View product">
              <Eye size={18} />
            </button>
          </div>
          <button className="skeleton-button" disabled>
            Add To Cart
          </button>
        </div>
        <h3 className="skeleton-text" style={{ width: '100%', height: '16px' }}></h3>
        <div className="product-card__price">
          <div className="skeleton-text" style={{ width: '60%', height: '20px' }}></div>
        </div>
        <div className="product-card__rating">
          <div className="skeleton-text" style={{ width: '80px', height: '14px' }}></div>
          <span
            className="skeleton-text"
            style={{ width: '40px', height: '12px', display: 'inline-block' }}
          ></span>
        </div>
      </article>
    );
  }

  const isOutOfStock = product.stockStatus === 'Out of Stock';
  const quickAddSelection = getQuickAddSelection(product, variants);
  const shouldChooseOptions = requiresVariantSelection(product) && !quickAddSelection;
  const handleQuickAdd = () => {
    if (shouldChooseOptions) {
      navigate(`/product/${product.id}`);
      return;
    }

    void onAdd(
      product.id,
      1,
      quickAddSelection?.selectedColor ?? '',
      quickAddSelection?.selectedSize ?? ''
    );
  };

  return (
    <article className="product-card">
      <div className="product-card__media">
        {product.discountPercent > 0 && (
          <span className="discount">-{product.discountPercent}%</span>
        )}
        {isOutOfStock && <span className="out-badge">OUT OF STOCK</span>}
        {product.isNew && !isOutOfStock && <span className="new-badge">NEW</span>}
        <div className="card-tools">
          {showWishlistButton && (
            <button onClick={() => onWishlist(product.id)} aria-label={`Wishlist ${product.name}`}>
              <Heart
                size={18}
                fill={isInWishlist ? 'currentColor' : 'none'}
                className={isInWishlist ? 'text-red-500' : ''}
              />
            </button>
          )}
          <button
            onClick={() => navigate(`/product/${product.id}`)}
            aria-label={`View ${product.name}`}
          >
            <Eye size={18} />
          </button>
        </div>
        <ProductVisual src={resolveProductImage(product)} type={product.image} />
        <button className="add-cart" onClick={handleQuickAdd} disabled={isOutOfStock}>
          {isOutOfStock ? 'Out of stock' : shouldChooseOptions ? 'Choose Options' : 'Add To Cart'}
        </button>
      </div>
      <button className="product-card__title" onClick={() => navigate(`/product/${product.id}`)}>
        {product.name}
      </button>
      <div className="product-card__price">
        <strong>{formatMoney(product.price)}</strong>
        {product.originalPrice > 0 && <del>{formatMoney(product.originalPrice)}</del>}
      </div>
      <div className="product-card__rating">
        <Stars value={product.rating} />
        <span>({product.reviewCount})</span>
      </div>
      {secondaryAction && <div className="product-card__actions">{secondaryAction}</div>}
    </article>
  );
}
