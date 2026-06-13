import { useEffect, useMemo, useState } from 'react';
import { useValidateCouponMutation } from '../api/ecommerceApi';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '../components/Button';
import { CartItem as CartItemRow } from '../components/CartItem';
import { CartTotals } from '../components/CartTotals';
import { EmptyState, ErrorState } from '../components/StateViews';
import { getErrorMessage } from '../lib/errors';
import { getRtkErrorMessage } from '../lib/rtkErrors';
import type { AuthStatus, Cart, CartItem, Coupon, Navigate, RefreshCart } from '../types';
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
  onUpdateQuantity?: (id: string, quantity: number) => void | Promise<void>;
  onRemoveItem?: (id: string) => void;
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
}: CartPageProps) {
  const [couponInput, setCouponInput] = useState(appliedCoupon);
  const [actionError, setActionError] = useState('');
  const [couponStatus, setCouponStatus] = useState('');
  const [couponIsError, setCouponIsError] = useState(false);
  const [activeCoupon, setActiveCoupon] = useState<Coupon | null>(null);
  const [draftQuantities, setDraftQuantities] = useState<Record<string, number>>({});
  const [validateCoupon, validateCouponState] = useValidateCouponMutation();
  const couponApplying = validateCouponState.isLoading;

  useEffect(() => {
    setCouponInput(appliedCoupon);
  }, [appliedCoupon]);

  useEffect(() => {
    setDraftQuantities((currentDrafts) => {
      const nextDrafts = Object.fromEntries(cart.items.map((item) => [item.id, item.quantity]));
      const currentIds = Object.keys(currentDrafts);
      const nextIds = Object.keys(nextDrafts);
      const hasSameDrafts =
        currentIds.length === nextIds.length &&
        nextIds.every((id) => currentDrafts[id] === nextDrafts[id]);

      return hasSameDrafts ? currentDrafts : nextDrafts;
    });
  }, [cart.items]);

  const changedQuantities = useMemo(
    () =>
      cart.items.filter((item) => {
        const draftQuantity = draftQuantities[item.id] ?? item.quantity;
        return draftQuantity !== item.quantity;
      }),
    [cart.items, draftQuantities]
  );
  const canUpdateCart = changedQuantities.length > 0 && Boolean(onUpdateQuantity);

  const displayCart = useMemo(() => {
    if (!activeCoupon) return cart;
    const discount =
      activeCoupon.type === 'percent'
        ? Math.round(cart.subtotal * (activeCoupon.amount / 100))
        : activeCoupon.amount;
    return {
      ...cart,
      discount,
      total: Math.max(0, cart.subtotal - discount + cart.shipping),
    };
  }, [activeCoupon, cart]);

  const applyCoupon = async () => {
    try {
      setActionError('');
      setCouponStatus('');
      setCouponIsError(false);
      const code = couponInput.trim().toUpperCase();

      if (!code) {
        setActiveCoupon(null);
        setCouponInput('');
        onAppliedCouponChange('');
        await refreshCart('');
        setCouponStatus('Coupon removed.');
        return;
      }

      const result = await validateCoupon(code).unwrap();
      setActiveCoupon(result.coupon);
      setCouponInput(result.coupon.code);
      onAppliedCouponChange(result.coupon.code);
      await refreshCart(result.coupon.code);
      setCouponStatus(`Coupon ${result.coupon.code} applied.`);
    } catch (error) {
      setActiveCoupon(null);
      onAppliedCouponChange('');
      setCouponIsError(true);
      setCouponStatus(getRtkErrorMessage(error) || getErrorMessage(error));
    }
  };

  const updateQty = (item: CartItem, quantity: number) => {
    setActionError('');
    setCouponStatus('');
    setDraftQuantities((currentDrafts) => ({
      ...currentDrafts,
      [item.id]: Math.max(1, quantity),
    }));
  };

  const updateCart = async () => {
    if (!canUpdateCart || !onUpdateQuantity) return;

    try {
      setActionError('');
      await Promise.all(
        changedQuantities.map((item) =>
          onUpdateQuantity(item.id, draftQuantities[item.id] ?? item.quantity)
        )
      );
      await refreshCart(appliedCoupon);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const remove = (id: string) => {
    setActionError('');
    onRemoveItem?.(id);
  };

  if (authStatus === 'unauthenticated' && !cart.items.length) {
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
  if (authStatus === 'loading' || cartLoading) {
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
            item={{ ...item, quantity: draftQuantities[item.id] ?? item.quantity }}
            onQuantityChange={(_, quantity) => updateQty(item, quantity)}
            onRemove={remove}
          />
        ))}
      </div>
      <div className="cart-actions">
        <Button variant="ghost" onClick={() => navigate('/')}>
          Return To Shop
        </Button>
        <Button variant="ghost" onClick={updateCart} disabled={!canUpdateCart}>
          Update Cart
        </Button>
      </div>
      <div className="checkout-strip">
        <div className="coupon">
          <input
            value={couponInput}
            onChange={(event) => setCouponInput(event.target.value)}
            placeholder="Coupon Code"
          />
          <Button onClick={applyCoupon} disabled={couponApplying}>
            {appliedCoupon ? `Applied: ${appliedCoupon}` : 'Apply Coupon'}
          </Button>
          {couponStatus && (
            <p className={`coupon__status ${couponIsError ? 'form-status--error' : ''}`}>
              {couponStatus}
            </p>
          )}
        </div>
        <CartTotals
          cart={displayCart}
          action={<Button onClick={() => navigate('/checkout')}>Proceed to checkout</Button>}
        />
      </div>
    </main>
  );
}
