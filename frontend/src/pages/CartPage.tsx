import { X } from "lucide-react";
import { useState } from "react";
import { api } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { CartTotals } from "../components/CartTotals";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { ProductVisual } from "../components/ProductVisual";
import { QuantityStepper } from "../components/QuantityStepper";
import { getErrorMessage } from "../lib/errors";
import { formatMoney } from "../lib/format";
import type { AuthStatus, Cart, Navigate, RefreshCart } from "../types";

type CartPageProps = {
  authStatus: AuthStatus;
  cart: Cart;
  cartLoading: boolean;
  cartError: string;
  navigate: Navigate;
  refreshCart: RefreshCart;
  appliedCoupon: string;
  onAppliedCouponChange: (code: string) => void;
};

export function CartPage({ authStatus, cart, cartLoading, cartError, navigate, refreshCart, appliedCoupon, onAppliedCouponChange }: CartPageProps) {
  const [couponInput, setCouponInput] = useState(appliedCoupon);
  const [actionError, setActionError] = useState("");

  const applyCoupon = async () => {
    try {
      setActionError("");
      onAppliedCouponChange(couponInput.trim().toUpperCase());
      await refreshCart(couponInput.trim().toUpperCase());
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const updateQty = async (id: string, quantity: number) => {
    try {
      setActionError("");
      await api(`/api/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
      refreshCart(appliedCoupon);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };
  const remove = async (id: string) => {
    try {
      setActionError("");
      await api(`/api/cart/items/${id}`, { method: "DELETE" });
      refreshCart(appliedCoupon);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  if (authStatus === "checking" || cartLoading) {
    return <main className="container page"><LoadingState title="Loading cart" message="We are checking your cart." /></main>;
  }

  if (authStatus === "guest") {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Cart"]} />
        <EmptyState
          title="Sign in to view your cart"
          message="Your cart is saved to your account so it is ready whenever you come back."
          action={{ label: "Sign In or Register", onClick: () => navigate("/account") }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  if (cartError) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Cart"]} />
        <ErrorState
          title="We could not load your cart"
          message={cartError}
          action={{ label: "Try Again", onClick: () => refreshCart() }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  if (!cart.items.length) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Cart"]} />
        <EmptyState
          title="Your cart is empty"
          message="Add a few products before checking out."
          action={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  return (
    <main className="container page">
      <Breadcrumbs items={["Home", "Cart"]} />
      {actionError && <p className="form-status form-status--error">{actionError}</p>}
      <div className="cart-table">
        <div className="cart-head"><span>Product</span><span>Price</span><span>Quantity</span><span>Subtotal</span></div>
        {cart.items.map((item) => <div className="cart-row" key={item.id}><div><ProductVisual type={item.product.image} /><button onClick={() => remove(item.id)}><X size={16} /></button><span>{item.product.name}</span></div><span>{formatMoney(item.product.price)}</span><QuantityStepper value={item.quantity} onChange={(qty) => updateQty(item.id, qty)} /><strong>{formatMoney(item.lineTotal)}</strong></div>)}
      </div>
      <div className="cart-actions"><Button variant="ghost" onClick={() => navigate("/")}>Return To Shop</Button><Button variant="ghost" onClick={() => refreshCart(appliedCoupon)}>Update Cart</Button></div>
      <div className="checkout-strip"><div className="coupon"><input value={couponInput} onChange={(event) => setCouponInput(event.target.value)} placeholder="Coupon Code" /><Button onClick={applyCoupon}>{appliedCoupon ? `Applied: ${appliedCoupon}` : "Apply Coupon"}</Button></div><CartTotals cart={cart} action={<Button onClick={() => navigate("/checkout")}>Proceed to checkout</Button>} /></div>
    </main>
  );
}
