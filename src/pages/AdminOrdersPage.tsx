import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, RefreshCw, Search } from "lucide-react";
import { api } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import { formatMoney } from "../lib/format";
import type {
  AdminOrder,
  AdminOrdersResponse,
  AsyncState,
  Navigate,
  PublicUser,
} from "../types";

type AdminOrdersPageProps = {
  userState: AsyncState<PublicUser | null>;
  navigate: Navigate;
};

const statusFilters = [
  { value: "", label: "All statuses" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "cancelled", label: "Cancelled" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Pending";
}

function isStripeAttentionOrder(order: AdminOrder) {
  return (
    order.paymentMethod === "stripe" &&
    (order.status === "processing" || order.status === "cancelled")
  );
}

export function AdminOrdersPage({ userState, navigate }: AdminOrdersPageProps) {
  const [ordersState, setOrdersState] = useState<AsyncState<AdminOrder[]>>({
    data: [],
    loading: false,
    error: "",
  });
  const [status, setStatus] = useState("");
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [total, setTotal] = useState(0);

  const canLoadOrders = userState.data?.role === "admin";

  const loadOrders = useCallback(async () => {
    if (!canLoadOrders) return;
    const params = new URLSearchParams({ limit: "50" });
    if (status) params.set("status", status);
    if (submittedEmail) params.set("email", submittedEmail);

    setOrdersState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<AdminOrdersResponse>(
        `/api/admin/orders?${params.toString()}`,
      );
      setOrdersState({ data: data.orders, loading: false, error: "" });
      setTotal(data.total);
    } catch (error) {
      setOrdersState((current) => ({
        ...current,
        loading: false,
        error: getErrorMessage(error),
      }));
    }
  }, [canLoadOrders, status, submittedEmail]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const attentionOrders = useMemo(
    () => ordersState.data.filter(isStripeAttentionOrder),
    [ordersState.data],
  );

  const submitEmailSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedEmail(email.trim());
  };

  if (userState.loading) {
    return (
      <main className="container page">
        <LoadingState
          title="Loading admin"
          message="We are checking your access."
        />
      </main>
    );
  }

  if (!userState.data) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Admin"]} />
        <EmptyState
          title="Admin access requires sign in"
          message="Sign in with an administrator account to review orders."
          action={{ label: "Sign In", onClick: () => navigate("/account") }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  if (userState.data.role !== "admin") {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Admin"]} />
        <ErrorState
          title="Admin access required"
          message="This order console is only available to administrators."
          action={{ label: "View Account", onClick: () => navigate("/account") }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  return (
    <main className="container page admin-orders-page">
      <Breadcrumbs items={["Home", "Admin", "Orders"]} />
      <section className="admin-orders-hero">
        <div>
          <p className="eyebrow">Admin console</p>
          <h1 className="page-title">Order payment watchlist</h1>
          <p>
            Review recent orders and quickly spot Stripe checkouts that are
            still processing or ended cancelled.
          </p>
        </div>
        <div className="admin-orders-metrics" aria-label="Order metrics">
          <span>
            <strong>{total}</strong>
            Total
          </span>
          <span className={attentionOrders.length ? "is-alert" : ""}>
            <strong>{attentionOrders.length}</strong>
            Needs review
          </span>
        </div>
      </section>

      <section className="admin-orders-toolbar" aria-label="Order filters">
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {statusFilters.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
        <form className="admin-orders-search" onSubmit={submitEmailSearch}>
          <label>
            Customer email
            <input
              type="search"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="customer@example.com"
            />
          </label>
          <Button type="submit" variant="ghost">
            <Search size={16} />
            Search
          </Button>
        </form>
        <Button onClick={loadOrders} disabled={ordersState.loading}>
          <RefreshCw size={16} />
          {ordersState.loading ? "Refreshing" : "Refresh"}
        </Button>
      </section>

      {ordersState.error && (
        <p className="form-status form-status--error">{ordersState.error}</p>
      )}

      {!ordersState.loading && !ordersState.error && !ordersState.data.length && (
        <p className="admin-orders-empty">No orders match these filters.</p>
      )}

      <section className="admin-orders-list" aria-label="Admin order list">
        {ordersState.data.map((order) => {
          const needsReview = isStripeAttentionOrder(order);
          return (
            <article
              className={`admin-order-row ${needsReview ? "admin-order-row--alert" : ""}`}
              key={order.id}
            >
              <div className="admin-order-row__main">
                <div>
                  <strong>{order.id}</strong>
                  <span>
                    {formatDate(order.createdAt)} | {order.customerEmail}
                  </span>
                </div>
                {needsReview && (
                  <span className="admin-order-alert">
                    <AlertTriangle size={16} />
                    Stripe review
                  </span>
                )}
              </div>
              <div className="admin-order-row__meta">
                <span>{formatStatus(order.status)}</span>
                <span>{order.paymentMethod}</span>
                <span>{order.items.length} item{order.items.length === 1 ? "" : "s"}</span>
                <strong>{formatMoney(order.total)}</strong>
              </div>
              <div className="admin-order-row__items">
                {order.items.map((item) => (
                  <span key={item.id}>
                    {item.name} x {item.quantity}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
