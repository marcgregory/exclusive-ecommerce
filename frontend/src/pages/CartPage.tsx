import { useState } from 'react';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '../components/Button';
import { CartItem as CartItemRow } from '../components/CartItem';
import { CartTotals } from '../components/CartTotals';
import { EmptyState, ErrorState } from '../components/StateViews';
import { getErrorMessage } from '../lib/errors';
import type { AuthStatus, Cart, CartItem, Navigate, RefreshCart } from '../types';
import { CartSkeleton } from '../components/skeletons/CartSkeleton';

type CartPageProps = {
  authStatus: AuthStatus;
  cart: Cart;
  cartLoading: boolean;
  cartError: string;
  navigate: Navigate;
  refreshCart: RefreshCart;
  appliedCoupon: string;
  onAppliedCouponChange: (code: string) => void;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onRemoveItem?: (id: string) => void;
  onClearCart?: () => void;
};

export function CartPage({
  authStatus,
  cart,
  cartLoading,
  cartError,
  navigate,
  refreshCart,
  appliedCoupon,
  onAppliedCouponChange,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: CartPageProps) {
  const [couponInput, setCouponInput] = useState(appliedCoupon);
  const [actionError, setActionError] = useState('');

  const applyCoupon = async () => {
    try {
      setActionError('');
      onAppliedCouponChange(couponInput.trim().toUpperCase());
      await refreshCart(couponInput.trim().toUpperCase());
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const updateQty = (item: CartItem, quantity: number) => {
    if (quantity === item.quantity) return;
    setActionError('');
    onUpdateQuantity?.(item.id, quantity);
  };

  const remove = (id: string) => {
    setActionError('');
    onRemoveItem?.(id);
  };

  if (authStatus === 'guest' && !cart.items.length) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Cart']} />
        <EmptyState
          title="Sign in to view your cart"
          message="Your cart is saved to your account so it is ready whenever you come back."
          action={{ label: 'Sign In or Register', onClick: () => navigate('/login') }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  // Show skeleton while auth or cart data is loading.
  if (authStatus === 'checking' || cartLoading) {
    return <CartSkeleton />;
  }

  if (cartError) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Cart']} />
        <ErrorState
          title="We could not load your cart"
          message={cartError}
          action={{ label: 'Try Again', onClick: () => refreshCart() }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  if (!cart.items.length) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Cart']} />
        <EmptyState
          title="Your cart is empty"
          message="Add a few products before checking out."
          action={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  return (
    <main className="container page">
      <Breadcrumbs items={['Home', 'Cart']} />
      {actionError && <p className="form-status form-status--error">{actionError}</p>}
      <div className="cart-table">
        <div className="cart-head">
          <span>Product</span>
          <span>Price</span>
          <span>Quantity</span>
          <span>Subtotal</span>
        </div>
        {cart.items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onQuantityChange={(_, quantity) => updateQty(item, quantity)}
            onRemove={remove}
          />
        ))}
      </div>
      <div className="cart-actions">
        <Button variant="ghost" onClick={() => navigate('/')}>
          Return To Shop
        </Button>
        <Button variant="ghost" onClick={() => refreshCart(appliedCoupon)}>
          Update Cart
        </Button>
        <Button variant="ghost" onClick={() => onClearCart?.()}>
          Clear Cart
        </Button>
      </div>
      <div className="checkout-strip">
        <div className="coupon">
          <input
            value={couponInput}
            onChange={(event) => setCouponInput(event.target.value)}
            placeholder="Coupon Code"
          />
          <Button onClick={applyCoupon}>
            {appliedCoupon ? `Applied: ${appliedCoupon}` : 'Apply Coupon'}
          </Button>
        </div>
        <CartTotals
          cart={cart}
          action={<Button onClick={() => navigate('/checkout')}>Proceed to checkout</Button>}
        />
      </div>
    </main>
  );
}
