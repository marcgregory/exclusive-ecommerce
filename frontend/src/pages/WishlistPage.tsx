import { Eye, ShoppingCart, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  useAddCartItemMutation,
  useDeleteWishlistProductMutation,
  useGetWishlistQuery,
  useLazyGetProductDetailQuery,
} from '../api/ecommerceApi';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '../components/Button';
import { ProductVisual } from '../components/ProductVisual';
import { Stars } from '../components/Stars';
import { EmptyState, ErrorState } from '../components/StateViews';
import { getErrorMessage } from '../lib/errors';
import { formatMoney } from '../lib/format';
import { getQuickAddSelection, requiresVariantSelection } from '../lib/productVariants';
import { resolveProductImage } from '../lib/productUtils';
import { getRtkErrorMessage } from '../lib/rtkErrors';
import type { AddToCart, AuthStatus, Navigate, Product, RefreshCart } from '../types';
import { WishlistSkeleton } from '../components/skeletons/WishlistSkeleton';

const WISHLIST_SKELETON_FALLBACK = 4;

function getWishlistSkeletonCount(...counts: Array<number | undefined>) {
  const calculatedCount =
    counts.find((count) => Number.isFinite(count) && count > 0) ?? WISHLIST_SKELETON_FALLBACK;
  return Math.max(1, calculatedCount);
}

type WishlistPageProps = {
  authStatus: AuthStatus;
  navigate: Navigate;
  onAdd: AddToCart;
  refreshCart: RefreshCart;
  refreshWishlist: () => Promise<void>;
  recommendedProducts?: Product[];
};

export function WishlistPage({
  authStatus,
  navigate,
  onAdd,
  refreshCart,
  refreshWishlist,
  recommendedProducts = [],
}: WishlistPageProps) {
  const wishlistQuery = useGetWishlistQuery(undefined, { skip: authStatus !== 'authenticated' });
  const [getProductDetail] = useLazyGetProductDetailQuery();
  const [addCartItem] = useAddCartItemMutation();
  const [deleteWishlistProduct] = useDeleteWishlistProductMutation();
  const [products, setProducts] = useState<Product[]>([]);
  const [actionError, setActionError] = useState('');
  const [pendingProductId, setPendingProductId] = useState('');
  const wishlistSkeletonCount = getWishlistSkeletonCount(
    products.length,
    wishlistQuery.data?.products.length
  );

  const getMutationErrorMessage = (error: unknown) => {
    const rtkMessage = getRtkErrorMessage(error);
    if (rtkMessage && rtkMessage !== 'Request failed') return rtkMessage;
    return getErrorMessage(error, rtkMessage || 'Request failed');
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
      setActionError('');
      setPendingProductId(productId);
      setProducts((current) => current.filter((product) => product.id !== productId));
      await deleteWishlistProduct(productId).unwrap();
      await refreshWishlist();
    } catch (error) {
      setActionError(getMutationErrorMessage(error));
      setProducts(wishlistQuery.data?.products ?? []);
      wishlistQuery.refetch();
    } finally {
      setPendingProductId('');
    }
  };

  const handleMoveToCart = async (product: Product) => {
    if (pendingProductId) return;
    try {
      setActionError('');
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
        selectedColor: selection?.selectedColor ?? '',
        selectedSize: selection?.selectedSize ?? '',
      }).unwrap();
      await deleteWishlistProduct(product.id).unwrap();
      setProducts((current) => current.filter((entry) => entry.id !== product.id));
      await Promise.all([refreshCart(), refreshWishlist()]);
    } catch (error) {
      setActionError(getMutationErrorMessage(error));
    } finally {
      setPendingProductId('');
    }
  };

  if (authStatus === 'guest') {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Wishlist']} />
        <EmptyState
          title="Sign in to view your wishlist"
          message="Save products to your account and keep them ready for later."
          action={{ label: 'Sign In or Register', onClick: () => navigate('/login') }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  // Show skeleton while auth or wishlist data is loading.
  if (authStatus === 'checking' || wishlistQuery.isLoading || wishlistQuery.isFetching) {
    return <WishlistSkeleton count={wishlistSkeletonCount} />;
  }

  const wishlistError = getRtkErrorMessage(wishlistQuery.error);
  const wishlistIds = new Set(products.map((product) => product.id));
  const justForYouProducts = recommendedProducts
    .filter((product) => !wishlistIds.has(product.id))
    .slice(0, 4);

  const handleMoveAllToCart = async () => {
    for (const product of products) {
      if (pendingProductId) return;
      if (product.stockStatus !== 'Out of Stock') {
        await handleMoveToCart(product);
      }
    }
  };

  if (wishlistError || (!wishlistQuery.data && wishlistQuery.isError)) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Wishlist']} />
        <ErrorState
          title="We could not load your wishlist"
          message={wishlistError || 'Request failed'}
          action={{ label: 'Try Again', onClick: loadWishlist }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  if (!products.length) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Wishlist']} />
        <EmptyState
          title="Your wishlist is empty"
          message="Save products here when you want to compare or buy them later."
          action={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  return (
    <main className="container page wishlist-page">
      <div className="wishlist-page__bar">
        <h1>Wishlist ({products.length})</h1>
        <Button variant="ghost" onClick={handleMoveAllToCart} disabled={Boolean(pendingProductId)}>
          Move All To Bag
        </Button>
      </div>
      {actionError && <p className="form-status form-status--error">{actionError}</p>}
      <div className="wishlist-grid">
        {products.map((product) => (
          <WishlistProductCard
            key={product.id}
            product={product}
            navigate={navigate}
            onMoveToCart={() => handleMoveToCart(product)}
            onRemove={() => handleRemove(product.id)}
            pending={pendingProductId === product.id}
            actionIcon="trash"
          />
        ))}
      </div>
      {justForYouProducts.length > 0 && (
        <section className="wishlist-recommendations" aria-labelledby="wishlist-recommendations">
          <div className="wishlist-section-bar">
            <div className="wishlist-section-title">
              <span aria-hidden="true" />
              <h2 id="wishlist-recommendations">Just For You</h2>
            </div>
            <Button variant="ghost" onClick={() => navigate('/')}>
              See All
            </Button>
          </div>
          <div className="wishlist-grid">
            {justForYouProducts.map((product) => (
              <WishlistProductCard
                key={product.id}
                product={product}
                navigate={navigate}
                onMoveToCart={() => onAdd(product.id, 1)}
                onRemove={() => navigate(`/product/${product.id}`)}
                pending={false}
                actionIcon="view"
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

type WishlistProductCardProps = {
  product: Product;
  navigate: Navigate;
  onMoveToCart: () => void;
  onRemove: () => void;
  pending: boolean;
  actionIcon: 'trash' | 'view';
};

function WishlistProductCard({
  product,
  navigate,
  onMoveToCart,
  onRemove,
  pending,
  actionIcon,
}: WishlistProductCardProps) {
  const isOutOfStock = product.stockStatus === 'Out of Stock';
  const actionLabel = actionIcon === 'trash' ? `Remove ${product.name}` : `View ${product.name}`;

  return (
    <article className="wishlist-card">
      <div className="wishlist-card__media">
        {product.discountPercent > 0 && (
          <span className="discount">-{product.discountPercent}%</span>
        )}
        {product.isNew && !isOutOfStock && <span className="new-badge">NEW</span>}
        {isOutOfStock && <span className="out-badge">OUT OF STOCK</span>}
        <button
          className="wishlist-card__tool"
          type="button"
          onClick={onRemove}
          disabled={pending}
          aria-label={actionLabel}
        >
          {actionIcon === 'trash' ? <Trash2 size={17} /> : <Eye size={17} />}
        </button>
        <ProductVisual src={resolveProductImage(product)} type={product.image} />
        <button
          className="wishlist-card__cart"
          type="button"
          onClick={onMoveToCart}
          disabled={pending || isOutOfStock}
          aria-label={isOutOfStock ? 'Out of stock' : 'Move to cart'}
        >
          <ShoppingCart size={16} />
          {isOutOfStock ? 'Out of Stock' : 'Add To Cart'}
        </button>
      </div>
      <button className="wishlist-card__title" onClick={() => navigate(`/product/${product.id}`)}>
        {product.name}
      </button>
      <div className="wishlist-card__price">
        <strong>{formatMoney(product.price)}</strong>
        {product.originalPrice > 0 && <del>{formatMoney(product.originalPrice)}</del>}
      </div>
      {actionIcon === 'view' && (
        <div className="wishlist-card__rating">
          <Stars value={product.rating} />
          <span>({product.reviewCount})</span>
        </div>
      )}
    </article>
  );
}
