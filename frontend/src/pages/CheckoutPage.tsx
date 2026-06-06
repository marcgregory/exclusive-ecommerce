import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe, type StripeElements } from "@stripe/stripe-js";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  useCreateOrderMutation,
  useCreatePaymentMutation,
} from "../api/ecommerceApi";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { OrderSummary } from "../components/OrderSummary";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import { getRtkErrorMessage, getRtkStatus } from "../lib/rtkErrors";
import type {
  AuthStatus,
  Cart,
  Navigate,
  RefreshCart,
} from "../types";

const pendingCheckoutStorageKey = "exclusive.pendingStripeCheckout";

type PendingStripeCheckout = {
  orderId: string;
  idempotencyKey: string;
  clientSecret?: string;
};

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
  const rtkStatus = getRtkStatus(error);
  if (typeof rtkStatus === "number") return rtkStatus;
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : undefined;
}

function getCheckoutErrorMessage(error: unknown) {
  const rtkMessage = getRtkErrorMessage(error);
  if (rtkMessage && rtkMessage !== "Request failed") return rtkMessage;
  return getErrorMessage(error, rtkMessage || "Request failed");
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

type StripePaymentFormProps = {
  submitting: boolean;
  onConfirm: (stripe: Stripe, elements: StripeElements) => Promise<void>;
};

const billingSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  companyName: z.string().trim().optional().default(""),
  streetAddress: z.string().trim().min(1, "Street address is required"),
  apartment: z.string().trim().optional().default(""),
  townCity: z.string().trim().min(1, "Town/city is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email("Enter a valid email address"),
});

type BillingFormInput = z.input<typeof billingSchema>;
type BillingForm = z.output<typeof billingSchema>;

function StripePaymentForm({
  submitting,
  onConfirm,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  return (
    <>
      <PaymentElement className="stripe-payment-element" />
      <Button
        type="button"
        onClick={() => {
          if (stripe && elements) void onConfirm(stripe, elements);
        }}
        disabled={submitting || !stripe || !elements}
      >
        {submitting ? "Confirming Payment..." : "Pay Now"}
      </Button>
    </>
  );
}

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
  const [createOrder] = useCreateOrderMutation();
  const [createPayment] = useCreatePaymentMutation();
  const [status, setStatus] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<BillingFormInput, unknown, BillingForm>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      firstName: "",
      companyName: "",
      streetAddress: "",
      apartment: "",
      townCity: "",
      phone: "",
      email: "",
    },
  });
  const [pendingStripePayment, setPendingStripePayment] =
    useState<PendingStripeCheckout | null>(() => readPendingCheckout());
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
  const stripePromise = useMemo(
    () =>
      pendingStripePayment?.clientSecret && publishableKey
        ? loadStripe(publishableKey)
        : null,
    [pendingStripePayment?.clientSecret, publishableKey],
  );

  useEffect(() => {
    if (pendingStripePayment?.clientSecret && !publishableKey) {
      setStatusIsError(true);
      setStatus("VITE_STRIPE_PUBLISHABLE_KEY is required for Stripe checkout");
    }
  }, [pendingStripePayment?.clientSecret, publishableKey]);

  const startStripePayment = async (checkout: PendingStripeCheckout) => {
    const paymentData = await createPayment({
      orderId: checkout.orderId,
      paymentMethod: "stripe",
    }).unwrap();
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

  const submit = handleSubmit(async (billing) => {
    const existingCheckout = readPendingCheckout();
    const idempotencyKey =
      existingCheckout?.idempotencyKey || createCheckoutIdempotencyKey();
    try {
      setSubmitting(true);
      setStatus("");
      setStatusIsError(false);
      const data = await createOrder({
        billing,
        paymentMethod: "stripe",
        couponCode: appliedCoupon || undefined,
        idempotencyKey,
      }).unwrap();

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
        setStatus(getCheckoutErrorMessage(payErr));
        await refreshCart();
        return;
      }
      await refreshCart();
      onCouponConsumed();
      clearPendingCheckout();
      navigate(`/orders/${data.order.id}`);
    } catch (error) {
      setStatusIsError(true);
      setStatus(getCheckoutErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  });

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
      setStatus(getCheckoutErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmStripePayment = async (
    stripe: Stripe,
    elements: StripeElements,
  ) => {
    if (!pendingStripePayment) return;

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
              register={register(name as keyof BillingFormInput)}
              error={errors[name as keyof BillingFormInput]?.message}
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
              {pendingStripePayment.clientSecret && stripePromise ? (
                <Elements
                  stripe={stripePromise}
                  options={{ clientSecret: pendingStripePayment.clientSecret }}
                >
                  <StripePaymentForm
                    submitting={submitting}
                    onConfirm={confirmStripePayment}
                  />
                </Elements>
              ) : pendingStripePayment.clientSecret ? null : (
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
