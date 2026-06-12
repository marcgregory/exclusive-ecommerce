import { Heart, RotateCcw, Truck } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  useAddWishlistProductMutation,
  useDeleteWishlistProductMutation,
  useGetProductDetailQuery,
} from '../api/ecommerceApi';
import { resolveProductImage } from '../lib/productUtils';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '../components/Button';
import { ErrorState } from '../components/StateViews';
import { ProductCard } from '../components/ProductCard';
import {
  getSelectorCartPayload,
  ProductOptionsSelector,
} from '../components/ProductOptionsSelector';
import { ProductVisual } from '../components/ProductVisual';
import { QuantityStepper } from '../components/QuantityStepper';
import { SectionHeader } from '../components/SectionHeader';
import { Stars } from '../components/Stars';
import { getErrorMessage } from '../lib/errors';
import { formatMoney } from '../lib/format';
import { getRtkErrorMessage, getRtkStatus } from '../lib/rtkErrors';
import type { AddToCart, AddToWishlist, Navigate } from '../types';
import { ProductDetailsSkeleton } from '../components/skeletons/ProductDetailsSkeleton';

type ProductDetailsPageProps = {
  id?: string;
  navigate: Navigate;
  onAdd: AddToCart;
  onWishlist: AddToWishlist;
  wishlistProductIds: string[];
};

function getActionErrorMessage(error: unknown) {
  const rtkMessage = getRtkErrorMessage(error);
  return rtkMessage && rtkMessage !== 'Request failed' ? rtkMessage : getErrorMessage(error);
}

export function ProductDetailsPage({
  id,
  navigate,
  onAdd,
  onWishlist,
  wishlistProductIds,
}: ProductDetailsPageProps) {
  const productQuery = useGetProductDetailQuery(id || '', { skip: !id });
  const [addWishlistProduct] = useAddWishlistProductMutation();
  const [deleteWishlistProduct] = useDeleteWishlistProductMutation();
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState('');
  const [showOptionValidation, setShowOptionValidation] = useState(false);

  // Debug logging for product images
  useEffect(() => {
    const { product } = productQuery.data || {};
    if (product) {
      console.log('Product details:', {
        name: product.name,
        image: product.image,
        imageUrl: product.imageUrl,
        thumbnail: product.thumbnail,
        images: product.images,
      });
    }
  }, [productQuery.data]);

  const productError = !id ? 'Product not found' : getRtkErrorMessage(productQuery.error);
  const isLoading = productQuery.isLoading;
  const productData = productQuery.data;

  if (productError) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Product']} />
        <ErrorState
          title="We could not load this product"
          message={productError || 'Product not found'}
          action={{ label: 'Try Again', onClick: productQuery.refetch }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Product']} />
        <ProductDetailsSkeleton />
      </main>
    );
  }

  const { product, related, variants = [] } = productData;
  const isInWishlist = wishlistProductIds.includes(product.id);
  const isOutOfStock = product.stockStatus === 'Out of Stock';
  const selectorPayload = getSelectorCartPayload(product, variants, selectedOptions);
  const canAddToCart = selectorPayload.isAvailable;
  const displayPrice = selectorPayload.unitPrice;

  const addToCart = async () => {
    if (!canAddToCart) {
      setShowOptionValidation(true);
      setActionError(
        isOutOfStock
          ? 'This product is currently out of stock.'
          : 'Please choose every required in-stock option before adding to cart.'
      );
      return false;
    }
    try {
      setActionError('');
      setShowOptionValidation(false);
      await onAdd(product, quantity, selectorPayload.selectedColor, selectorPayload.selectedSize, {
        selectedOptions: selectorPayload.selectedOptions,
        unitPrice: selectorPayload.unitPrice,
        variantId: selectorPayload.variantId,
        sku: selectorPayload.sku,
        stock: selectorPayload.stock,
      });
      return true;
    } catch (error) {
      if (getRtkStatus(error) === 401) {
        navigate('/login');
        return false;
      }
      setActionError(getActionErrorMessage(error));
      return false;
    }
  };

  const buyNow = async () => {
    const added = await addToCart();
    if (added) {
      navigate('/checkout');
    }
  };

  const addToWishlist = async () => {
    try {
      setActionError('');
      if (isInWishlist) {
        await deleteWishlistProduct(product.id).unwrap();
      } else {
        await addWishlistProduct(product.id).unwrap();
      }
    } catch (error) {
      if (getRtkStatus(error) === 401) {
        navigate('/login');
        return;
      }
      setActionError(getActionErrorMessage(error));
    }
  };

  return (
    <main className="container page product-detail-page">
      <Breadcrumbs items={['Account', product.category, product.name]} />
      {actionError && <p className="form-status form-status--error">{actionError}</p>}
      <section className="product-detail">
        <div className="thumbs">
          {((product.images?.length ?? 0 > 0) ? product.images : [product.image]).map((img) => (
            <button key={img}>
              <ProductVisual src={img} />
            </button>
          ))}
        </div>
        <div className="main-product-image">
          <ProductVisual src={resolveProductImage(product)} type={product.image} large />
        </div>
        <div className="product-info">
          <h1>{product.name}</h1>
          <div className="review-line">
            <Stars value={product.rating} />
            <span>({product.reviewCount} Reviews)</span>
            <i />{' '}
            <strong className={isOutOfStock ? 'stock-out' : 'stock-in'}>
              {isOutOfStock ? 'Out of stock' : product.stockStatus}
            </strong>
          </div>
          <p className="detail-price">{formatMoney(displayPrice)}</p>
          <p className="detail-copy">{product.description}</p>
          <hr />
          <ProductOptionsSelector
            product={product}
            variants={variants}
            selectedOptions={selectedOptions}
            onChange={(options) => {
              setActionError('');
              setSelectedOptions(options);
            }}
            showValidation={showOptionValidation}
          />
          <div className="buy-row">
            <QuantityStepper value={quantity} onChange={setQuantity} />
            <Button onClick={buyNow} disabled={!canAddToCart}>
              {isOutOfStock ? 'Out of stock' : 'Buy Now'}
            </Button>
            <button
              className="wishlist-square"
              onClick={addToWishlist}
              aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={isInWishlist}
            >
              <Heart
                size={20}
                fill={isInWishlist ? 'currentColor' : 'none'}
                stroke="currentColor"
                className={isInWishlist ? 'text-red-500' : ''}
              />
            </button>
          </div>
          <div className="delivery-box">
            <div>
              <Truck />
              <div>
                <h4>Free Delivery</h4>
                <p>Enter your postal code for Delivery Availability</p>
              </div>
            </div>
            <div>
              <RotateCcw />
              <div>
                <h4>Return Delivery</h4>
                <p>Free 30 Days Delivery Returns. Details</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <SectionHeader kicker="Related Item" title="" />
        <div className="product-grid four">
          {related.map((entry) => (
            <ProductCard
              key={entry.id}
              product={entry}
              onAdd={onAdd}
              onWishlist={onWishlist}
              navigate={navigate}
              isInWishlist={wishlistProductIds.includes(entry.id)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
