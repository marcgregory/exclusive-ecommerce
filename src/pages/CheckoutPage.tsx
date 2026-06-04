import { type FormEvent, useState } from "react";
import { api } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { OrderSummary } from "../components/OrderSummary";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import type {
  AuthStatus,
  Cart,
  Navigate,
  OrderResponse,
  RefreshCart,
} from "../types";

type CheckoutPageProps = {
  authStatus: AuthStatus;
  cart: Cart;
  cartLoading: boolean;
  cartError: string;
  refreshCart: RefreshCart;
  navigate: Navigate;
  appliedCoupon: string;
  onCouponConsumed: () => void;
};

export function CheckoutPage({
  authStatus,
  cart,
  cartLoading,
  cartError,
  refreshCart,
  navigate,
  appliedCoupon,
  onCouponConsumed,
}: CheckoutPageProps) {
  const [status, setStatus] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const billing = Object.fromEntries(form.entries());
    try {
      setSubmitting(true);
      setStatus("");
      setStatusIsError(false);
      const data = await api<OrderResponse>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          billing,
          paymentMethod: "bank",
          couponCode: appliedCoupon || undefined,
        }),
      });

      try {
        await api(`/api/payments`, {
          method: "POST",
          body: JSON.stringify({
            orderId: data.order.id,
            paymentMethod: "bank",
          }),
        });
      } catch (payErr) {
        setStatusIsError(true);
        setStatus(getErrorMessage(payErr));
        await refreshCart();
        return;
      }
      await refreshCart();
      onCouponConsumed();
      navigate(`/orders/${data.order.id}`);
    } catch (error) {
      setStatusIsError(true);
      setStatus(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (authStatus === "checking" || cartLoading) {
    return (
      <main className="container page">
        <LoadingState
          title="Loading checkout"
          message="We are checking your cart before checkout."
        />
      </main>
    );
  }

  if (authStatus === "guest") {
    return (
      <main className="container page">
        <Breadcrumbs
          items={["Account", "My Account", "Product", "View Cart", "Checkout"]}
        />
        <EmptyState
          title="Sign in to checkout"
          message="Create an account or sign in before placing an order."
          action={{
            label: "Sign In or Register",
            onClick: () => navigate("/account"),
          }}
          secondaryAction={{
            label: "Return To Shop",
            onClick: () => navigate("/"),
          }}
        />
      </main>
    );
  }

  if (cartError) {
    return (
      <main className="container page">
        <Breadcrumbs
          items={["Account", "My Account", "Product", "View Cart", "Checkout"]}
        />
        <ErrorState
          title="Checkout is not available yet"
          message={cartError}
          action={{ label: "Try Again", onClick: () => refreshCart() }}
          secondaryAction={{
            label: "Return To Shop",
            onClick: () => navigate("/"),
          }}
        />
      </main>
    );
  }

  if (!cart.items.length) {
    return (
      <main className="container page">
        <Breadcrumbs
          items={["Account", "My Account", "Product", "View Cart", "Checkout"]}
        />
        <EmptyState
          title="Your cart is empty"
          message="Add items to your cart before starting checkout."
          action={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  return (
    <main className="container page">
      <Breadcrumbs
        items={["Account", "My Account", "Product", "View Cart", "Checkout"]}
      />
      <h1 className="page-title">Billing Details</h1>
      <form className="checkout-form" onSubmit={submit}>
        <div className="form-grid">
          {[
            "firstName",
            "companyName",
            "streetAddress",
            "apartment",
            "townCity",
            "phone",
            "email",
          ].map((name) => (
            <FormField
              key={name}
              name={name}
              label={name.replace(/([A-Z])/g, " $1")}
              required={[
                "firstName",
                "streetAddress",
                "townCity",
                "phone",
                "email",
              ].includes(name)}
            />
          ))}
        </div>
        <div>
          <OrderSummary cart={cart} />
          <Button type="submit" disabled={submitting}>
            {submitting ? "Placing Order..." : "Place Order"}
          </Button>
          {status && (
            <p
              className={`form-status ${statusIsError ? "form-status--error" : ""}`}
            >
              {status}
            </p>
          )}
        </div>
      </form>
    </main>
  );
}
