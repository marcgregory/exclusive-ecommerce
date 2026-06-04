import { type FormEvent, useEffect, useRef, useState } from "react";
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
  PaymentResponse,
  RefreshCart,
} from "../types";

type StripeConstructor = (publishableKey: string) => StripeInstance | null;

type StripeInstance = {
  elements: (options: { clientSecret: string }) => StripeElements;
  confirmPayment: (options: {
    elements: StripeElements;
    confirmParams: { return_url: string };
    redirect: "if_required";
  }) => Promise<{
    error?: { message?: string };
    paymentIntent?: { status?: string };
  }>;
};

type StripeElements = {
  create: (type: "payment") => StripePaymentElement;
};

type StripePaymentElement = {
  mount: (target: HTMLElement) => void;
  unmount: () => void;
};

declare global {
  interface Window {
    Stripe?: StripeConstructor;
  }
}

let stripeScriptPromise: Promise<StripeConstructor> | null = null;
const pendingCheckoutStorageKey = "exclusive.pendingStripeCheckout";

type PendingStripeCheckout = {
  orderId: string;
  idempotencyKey: string;
  clientSecret?: string;
};

function loadStripeScript(): Promise<StripeConstructor> {
  if (window.Stripe) return Promise.resolve(window.Stripe);
  if (!stripeScriptPromise) {
    stripeScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.async = true;
      script.onload = () => {
        if (window.Stripe) resolve(window.Stripe);
        else reject(new Error("Stripe.js did not initialize"));
      };
      script.onerror = () => reject(new Error("Stripe.js could not be loaded"));
      document.head.appendChild(script);
    });
  }
  return stripeScriptPromise;
}

function createCheckoutIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `checkout-${crypto.randomUUID()}`;
  }
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readPendingCheckout(): PendingStripeCheckout | null {
  try {
    const raw = sessionStorage.getItem(pendingCheckoutStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingStripeCheckout>;
    if (!parsed.orderId || !parsed.idempotencyKey) return null;
    return {
      orderId: parsed.orderId,
      idempotencyKey: parsed.idempotencyKey,
      clientSecret: parsed.clientSecret,
    };
  } catch {
    return null;
  }
}

function writePendingCheckout(checkout: PendingStripeCheckout) {
  sessionStorage.setItem(pendingCheckoutStorageKey, JSON.stringify(checkout));
}

function clearPendingCheckout() {
  sessionStorage.removeItem(pendingCheckoutStorageKey);
}

function getApiStatus(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : undefined;
}

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
  const [stripeReady, setStripeReady] = useState(false);
  const [pendingStripePayment, setPendingStripePayment] =
    useState<PendingStripeCheckout | null>(() => readPendingCheckout());
  const stripeContainerRef = useRef<HTMLDivElement | null>(null);
  const stripeRef = useRef<StripeInstance | null>(null);
  const stripeElementsRef = useRef<StripeElements | null>(null);

  useEffect(() => {
    if (!pendingStripePayment?.clientSecret) return;
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
    let active = true;
    let paymentElement: StripePaymentElement | null = null;

    async function mountStripeElement() {
      try {
        setStripeReady(false);
        if (!publishableKey) {
          throw new Error("VITE_STRIPE_PUBLISHABLE_KEY is required for Stripe checkout");
        }
        const Stripe = await loadStripeScript();
        const stripe = Stripe(publishableKey);
        if (!stripe) throw new Error("Stripe checkout could not be initialized");
        if (!active || !stripeContainerRef.current) return;
        const elements = stripe.elements({
          clientSecret: pendingStripePayment.clientSecret,
        });
        paymentElement = elements.create("payment");
        paymentElement.mount(stripeContainerRef.current);
        stripeRef.current = stripe;
        stripeElementsRef.current = elements;
        setStripeReady(true);
      } catch (error) {
        if (!active) return;
        setStatusIsError(true);
        setStatus(getErrorMessage(error));
      }
    }

    void mountStripeElement();

    return () => {
      active = false;
      paymentElement?.unmount();
      stripeRef.current = null;
      stripeElementsRef.current = null;
      setStripeReady(false);
    };
  }, [pendingStripePayment]);

  const startStripePayment = async (checkout: PendingStripeCheckout) => {
    const paymentData = await api<PaymentResponse>(`/api/payments`, {
      method: "POST",
      body: JSON.stringify({
        orderId: checkout.orderId,
        paymentMethod: "stripe",
      }),
    });
    if (
      paymentData.payment.provider === "stripe" &&
      paymentData.payment.clientSecret
    ) {
      const nextCheckout = {
        ...checkout,
        clientSecret: paymentData.payment.clientSecret,
      };
      setPendingStripePayment(nextCheckout);
      writePendingCheckout(nextCheckout);
      setStatus("Enter your payment details to confirm the order.");
      return true;
    }
    return false;
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const billing = Object.fromEntries(form.entries());
    const existingCheckout = readPendingCheckout();
    const idempotencyKey =
      existingCheckout?.idempotencyKey || createCheckoutIdempotencyKey();
    try {
      setSubmitting(true);
      setStatus("");
      setStatusIsError(false);
      const data = await api<OrderResponse>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          billing,
          paymentMethod: "stripe",
          couponCode: appliedCoupon || undefined,
          idempotencyKey,
        }),
      });

      const checkout: PendingStripeCheckout = {
        orderId: data.order.id,
        idempotencyKey,
      };
      setPendingStripePayment(checkout);
      writePendingCheckout(checkout);

      try {
        if (await startStripePayment(checkout)) {
          return;
        }
      } catch (payErr) {
        setStatusIsError(true);
        setStatus(getErrorMessage(payErr));
        await refreshCart();
        return;
      }
      await refreshCart();
      onCouponConsumed();
      clearPendingCheckout();
      navigate(`/orders/${data.order.id}`);
    } catch (error) {
      setStatusIsError(true);
      setStatus(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const retryStripePaymentSetup = async () => {
    if (!pendingStripePayment) return;
    try {
      setSubmitting(true);
      setStatus("");
      setStatusIsError(false);
      await startStripePayment(pendingStripePayment);
    } catch (error) {
      if (getApiStatus(error) === 404) {
        clearPendingCheckout();
        setPendingStripePayment(null);
        setStatusIsError(true);
        setStatus("Saved checkout session expired. Please place your order again.");
        return;
      }
      setStatusIsError(true);
      setStatus(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmStripePayment = async () => {
    if (!pendingStripePayment) return;
    const stripe = stripeRef.current;
    const elements = stripeElementsRef.current;
    if (!stripe || !elements) {
      setStatusIsError(true);
      setStatus("Stripe checkout is still loading. Please try again.");
      return;
    }

    try {
      setSubmitting(true);
      setStatus("");
      setStatusIsError(false);
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/orders/${pendingStripePayment.orderId}`,
        },
        redirect: "if_required",
      });
      if (result.error) throw new Error(result.error.message || "Payment failed");
      if (result.paymentIntent?.status !== "succeeded") {
        throw new Error(
          `Payment is ${result.paymentIntent?.status || "not complete"}.`,
        );
      }
      await refreshCart();
      onCouponConsumed();
      clearPendingCheckout();
      navigate(`/orders/${pendingStripePayment.orderId}`);
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

  if (!cart.items.length && !pendingStripePayment) {
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
          {cart.items.length ? (
            <OrderSummary cart={cart} />
          ) : (
            <div className="stripe-payment-panel">
              <p className="form-status">
                Your order is waiting for payment confirmation.
              </p>
            </div>
          )}
          {pendingStripePayment && (
            <div className="stripe-payment-panel">
              {pendingStripePayment.clientSecret ? (
                <>
                  <div ref={stripeContainerRef} className="stripe-payment-element" />
                  <Button
                    type="button"
                    onClick={confirmStripePayment}
                    disabled={submitting || !stripeReady}
                  >
                    {submitting ? "Confirming Payment..." : "Pay Now"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={retryStripePaymentSetup}
                  disabled={submitting}
                >
                  {submitting ? "Resuming Payment..." : "Resume Payment"}
                </Button>
              )}
            </div>
          )}
          <Button type="submit" disabled={submitting || !!pendingStripePayment}>
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
