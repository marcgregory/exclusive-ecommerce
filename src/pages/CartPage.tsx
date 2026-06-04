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
import type { Cart, Navigate, RefreshCart } from "../types";

type CartPageProps = {
  cart: Cart;
  cartLoading: boolean;
  cartError: string;
  navigate: Navigate;
  refreshCart: RefreshCart;
};

export function CartPage({ cart, cartLoading, cartError, navigate, refreshCart }: CartPageProps) {
  const [coupon, setCoupon] = useState("");
  const [actionError, setActionError] = useState("");

  const updateQty = async (id: string, quantity: number) => {
    try {
      setActionError("");
      await api(`/api/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
      refreshCart();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };
  const remove = async (id: string) => {
    try {
      setActionError("");
      await api(`/api/cart/items/${id}`, { method: "DELETE" });
      refreshCart();
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  if (cartLoading) {
    return <main className="container page"><LoadingState title="Loading cart" message="We are checking your cart." /></main>;
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
      <div className="cart-actions"><Button variant="ghost" onClick={() => navigate("/")}>Return To Shop</Button><Button variant="ghost" onClick={() => refreshCart()}>Update Cart</Button></div>
      <div className="checkout-strip"><div className="coupon"><input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Coupon Code" /><Button onClick={() => refreshCart(coupon)}>Apply Coupon</Button></div><CartTotals cart={cart} action={<Button onClick={() => navigate("/checkout")}>Proceed to checkout</Button>} /></div>
    </main>
  );
}
