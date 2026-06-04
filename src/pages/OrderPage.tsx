import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { formatMoney } from "../lib/format";
import { getErrorMessage } from "../lib/errors";
import type { AuthStatus, Navigate, Order, OrderResponse } from "../types";

type OrderPageProps = {
  authStatus: AuthStatus;
  id?: string;
  navigate: Navigate;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatStatus(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Pending";
}

export function OrderPage({ authStatus, id, navigate }: OrderPageProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  const loadOrder = useCallback(async () => {
    if (authStatus !== "authenticated" || !id) return;
    setLoading(true);
    setError("");
    setNotFound(false);
    try {
      const data = await api<OrderResponse>(`/api/orders/${id}`);
      setOrder(data.order);
    } catch (requestError) {
      setOrder(null);
      setNotFound(requestError instanceof ApiError && requestError.status === 404);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [authStatus, id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (authStatus === "checking" || loading) {
    return <main className="container page"><LoadingState title="Loading order" message="We are getting your order details." /></main>;
  }

  if (authStatus === "guest") {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Orders"]} />
        <EmptyState
          title="Sign in to view this order"
          message="Order details are saved to your account."
          action={{ label: "Sign In or Register", onClick: () => navigate("/account") }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  if (!id || notFound) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Orders"]} />
        <ErrorState
          title="Order not found"
          message="We could not find that order for your account."
          action={{ label: "View Account", onClick: () => navigate("/account") }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Orders"]} />
        <ErrorState
          title="We could not load this order"
          message={error}
          action={{ label: "Try Again", onClick: loadOrder }}
          secondaryAction={{ label: "View Account", onClick: () => navigate("/account") }}
        />
      </main>
    );
  }

  return (
    <main className="container page">
      <Breadcrumbs items={["Home", "My Account", "Orders", order.id]} />
      <section className="order-confirmation">
        <div>
          <p className="eyebrow">Order confirmed</p>
          <h1 className="page-title">Thanks for your purchase.</h1>
          <p>Your order was placed on {formatDate(order.createdAt)} and is currently {formatStatus(order.status)}.</p>
          {order.status === "shipped" ? <p className="eyebrow">Payment received — thank you.</p> : null}
        </div>
        <div className="order-meta">
          <span>Order ID</span>
          <strong>{order.id}</strong>
          <span>Total</span>
          <strong>{formatMoney(order.total)}</strong>
        </div>
      </section>

      <section className="order-detail-layout">
        <div className="order-items-panel">
          <h2>Order Items</h2>
          {order.items.map((item) => (
            <div className="order-item-row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>
                  Qty {item.quantity}
                  {item.selectedColor ? ` | ${item.selectedColor}` : ""}
                  {item.selectedSize ? ` | Size ${item.selectedSize}` : ""}
                </span>
              </div>
              <strong>{formatMoney(item.price * item.quantity)}</strong>
            </div>
          ))}
        </div>

        <aside className="order-side-panel">
          <h2>Order Summary</h2>
          <p><span>Subtotal:</span><strong>{formatMoney(order.subtotal)}</strong></p>
          <p><span>Shipping:</span><strong>{order.shipping ? formatMoney(order.shipping) : "Free"}</strong></p>
          <p><span>Discount:</span><strong>{formatMoney(order.discount)}</strong></p>
          <p><span>Total:</span><strong>{formatMoney(order.total)}</strong></p>
          <h3>Billing</h3>
          <address>
            {order.billing.firstName} {order.billing.lastName}<br />
            {order.billing.streetAddress}<br />
            {order.billing.apartment ? <>{order.billing.apartment}<br /></> : null}
            {order.billing.townCity}<br />
            {order.billing.phone}<br />
            {order.billing.email}
          </address>
          <Button onClick={() => navigate("/account")}>View Order History</Button>
        </aside>
      </section>
    </main>
  );
}
