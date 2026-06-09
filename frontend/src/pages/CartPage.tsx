import { X } from "lucide-react";
import { useState } from "react";
import { useDeleteCartItemMutation, useUpdateCartItemMutation } from "../api/ecommerceApi";
import { resolveProductImage } from "../lib/productUtils";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { CartTotals } from "../components/CartTotals";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { ProductVisual } from "../components/ProductVisual";
import { QuantityStepper } from "../components/QuantityStepper";
import { getErrorMessage } from "../lib/errors";
import { formatMoney } from "../lib/format";
import { getRtkErrorMessage } from "../lib/rtkErrors";
import type { AuthStatus, Cart, CartItem, Navigate, RefreshCart } from "../types";

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
  const [updateCartItem] = useUpdateCartItemMutation();
  const [deleteCartItem] = useDeleteCartItemMutation();
  const [couponInput, setCouponInput] = useState(appliedCoupon);
  const [actionError, setActionError] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [stockLimits, setStockLimits] = useState<Record<string, number>>({});
  const [pendingItemId, setPendingItemId] = useState("");

  const extractStockLimit = (message: string) => {
    const match = message.match(/Only\s+(\d+)\s+.+\s+items?\s+are\s+available/i);
    return match ? Number(match[1]) : undefined;
  };

  const getMutationErrorMessage = (error: unknown) => {
    const rtkMessage = getRtkErrorMessage(error);
    if (rtkMessage && rtkMessage !== "Request failed") return rtkMessage;
    return getErrorMessage(error, rtkMessage || "Request failed");
  };

  const getVariantLabels = (item: CartItem) => [
    ...(item.selectedColor ? [{ label: "Color", value: item.selectedColor }] : []),
    ...(item.selectedSize ? [{ label: "Size", value: item.selectedSize }] : [])
  ];

  const applyCoupon = async () => {
    try {
      setActionError("");
      onAppliedCouponChange(couponInput.trim().toUpperCase());
      await refreshCart(couponInput.trim().toUpperCase());
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  };

  const updateQty = async (item: CartItem, quantity: number) => {
    if (quantity === item.quantity) return;
    try {
      setActionError("");
      setRowErrors((current) => {
        const rest = { ...current };
        delete rest[item.id];
        return rest;
      });
      setPendingItemId(item.id);
      await updateCartItem({ id: item.id, quantity }).unwrap();
      setStockLimits((current) => {
        const rest = { ...current };
        delete rest[item.id];
        return rest;
      });
      refreshCart(appliedCoupon);
    } catch (error) {
      const message = getMutationErrorMessage(error);
      const stockLimit = extractStockLimit(message);
      if (typeof stockLimit === "number") {
        setRowErrors((current) => ({ ...current, [item.id]: message }));
        setStockLimits((current) => ({ ...current, [item.id]: stockLimit }));
      } else {
        setActionError(message);
      }
    } finally {
      setPendingItemId("");
    }
  };
  const remove = async (id: string) => {
    try {
      setActionError("");
      setRowErrors((current) => {
        const rest = { ...current };
        delete rest[id];
        return rest;
      });
      await deleteCartItem(id).unwrap();
      refreshCart(appliedCoupon);
    } catch (error) {
      setActionError(getMutationErrorMessage(error));
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
        {cart.items.map((item) => {
          const variantLabels = getVariantLabels(item);
          const rowError = rowErrors[item.id];

          return (
            <div className="cart-row" key={item.id}>
              <div>
                <ProductVisual src={resolveProductImage(item.product)} type={item.product.image} />
                <button onClick={() => remove(item.id)} aria-label={`Remove ${item.product.name}`}><X size={16} /></button>
                <span className="cart-row__product">
                  <span>{item.product.name}</span>
                  {variantLabels.length > 0 && (
                    <span className="cart-row__variants" aria-label={`Selected options for ${item.product.name}`}>
                      {variantLabels.map((variant) => (
                        <span className="cart-row__variant" key={variant.label}>
                          {variant.label === "Color" && <i style={{ backgroundColor: variant.value }} aria-hidden="true" />}
                          {variant.label}: {variant.value}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
              </div>
              <span>{formatMoney(item.product.price)}</span>
              <div className="cart-row__quantity">
                <QuantityStepper
                  value={item.quantity}
                  max={stockLimits[item.id]}
                  disabled={pendingItemId === item.id}
                  onChange={(qty) => updateQty(item, qty)}
                  decrementLabel={`Decrease ${item.product.name} quantity`}
                  incrementLabel={`Increase ${item.product.name} quantity`}
                />
                {rowError && <p className="cart-row__error">{rowError}</p>}
              </div>
              <strong>{formatMoney(item.lineTotal)}</strong>
            </div>
          );
        })}
      </div>
      <div className="cart-actions"><Button variant="ghost" onClick={() => navigate("/")}>Return To Shop</Button><Button variant="ghost" onClick={() => refreshCart(appliedCoupon)}>Update Cart</Button></div>
      <div className="checkout-strip"><div className="coupon"><input value={couponInput} onChange={(event) => setCouponInput(event.target.value)} placeholder="Coupon Code" /><Button onClick={applyCoupon}>{appliedCoupon ? `Applied: ${appliedCoupon}` : "Apply Coupon"}</Button></div><CartTotals cart={cart} action={<Button onClick={() => navigate("/checkout")}>Proceed to checkout</Button>} /></div>
    </main>
  );
}
