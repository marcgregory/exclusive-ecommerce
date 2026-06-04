import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { api, ApiError } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import { formatMoney } from "../lib/format";
import type { AdminOrder, AsyncState, Navigate, PublicUser } from "../types";

type AdminOrderDetailPageProps = {
  id?: string;
  userState: AsyncState<PublicUser | null>;
  navigate: Navigate;
};

type SaveState = {
  loading: boolean;
  error: string;
  success: string;
};

const statusOptions = [
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const emptySaveState: SaveState = { loading: false, error: "", success: "" };

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

function billingLine(order: AdminOrder) {
  return [
    `${order.billing.firstName || ""} ${order.billing.lastName || ""}`.trim(),
    order.billing.streetAddress,
    order.billing.apartment,
    order.billing.townCity,
    order.billing.phone,
    order.billing.email,
  ].filter(Boolean);
}

export function AdminOrderDetailPage({
  id,
  userState,
  navigate,
}: AdminOrderDetailPageProps) {
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [status, setStatus] = useState("processing");
  const [internalNote, setInternalNote] = useState("");
  const [statusSave, setStatusSave] = useState<SaveState>(emptySaveState);
  const [noteSave, setNoteSave] = useState<SaveState>(emptySaveState);

  const canLoadOrder = userState.data?.role === "admin";

  const applyOrder = (nextOrder: AdminOrder) => {
    setOrder(nextOrder);
    setStatus(nextOrder.status);
    setInternalNote(nextOrder.internalNote || "");
  };

  const loadOrder = useCallback(async () => {
    if (!canLoadOrder || !id) return;
    setLoading(true);
    setError("");
    setNotFound(false);
    setStatusSave(emptySaveState);
    setNoteSave(emptySaveState);
    try {
      const data = await api<{ order: AdminOrder }>(`/api/admin/orders/${id}`);
      applyOrder(data.order);
    } catch (requestError) {
      setOrder(null);
      setNotFound(requestError instanceof ApiError && requestError.status === 404);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [canLoadOrder, id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const saveStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;
    setStatusSave({ loading: true, error: "", success: "" });
    try {
      const data = await api<{ order: AdminOrder }>(`/api/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      applyOrder(data.order);
      setStatusSave({ loading: false, error: "", success: "Status updated." });
    } catch (requestError) {
      setStatusSave({
        loading: false,
        error: getErrorMessage(requestError),
        success: "",
      });
    }
  };

  const saveInternalNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id) return;
    setNoteSave({ loading: true, error: "", success: "" });
    try {
      const data = await api<{ order: AdminOrder }>(`/api/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ internalNote }),
      });
      applyOrder(data.order);
      setNoteSave({ loading: false, error: "", success: "Internal note saved." });
    } catch (requestError) {
      setNoteSave({
        loading: false,
        error: getErrorMessage(requestError),
        success: "",
      });
    }
  };

  if (userState.loading || loading) {
    return (
      <main className="container page">
        <LoadingState
          title="Loading admin order"
          message="We are getting the order details."
        />
      </main>
    );
  }

  if (!userState.data) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Admin", "Orders"]} />
        <EmptyState
          title="Admin access requires sign in"
          message="Sign in with an administrator account to review this order."
          action={{ label: "Sign In", onClick: () => navigate("/account") }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  if (userState.data.role !== "admin") {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Admin", "Orders"]} />
        <ErrorState
          title="Admin access required"
          message="This order detail is only available to administrators."
          action={{ label: "View Account", onClick: () => navigate("/account") }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  if (!id || notFound) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Admin", "Orders"]} />
        <ErrorState
          title="Order not found"
          message="We could not find that admin order."
          action={{ label: "Back To Orders", onClick: () => navigate("/admin/orders") }}
        />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "Admin", "Orders"]} />
        <ErrorState
          title="We could not load this order"
          message={error}
          action={{ label: "Try Again", onClick: loadOrder }}
          secondaryAction={{ label: "Back To Orders", onClick: () => navigate("/admin/orders") }}
        />
      </main>
    );
  }

  return (
    <main className="container page admin-order-detail-page">
      <Breadcrumbs items={["Home", "Admin", "Orders", order.id]} />
      <section className="admin-order-detail-hero">
        <div>
          <p className="eyebrow">Admin order detail</p>
          <h1 className="page-title">{order.id}</h1>
          <p>
            {order.customerName} | {order.customerEmail} | {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="admin-order-detail-actions">
          <Button variant="ghost" onClick={() => navigate("/admin/orders")}>
            <ArrowLeft size={16} />
            Back To Orders
          </Button>
          <Button variant="ghost" onClick={loadOrder} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>
      </section>

      <section className="admin-order-detail-grid">
        <div className="admin-order-detail-main">
          <section className="admin-detail-card admin-status-card">
            <div>
              <p className="eyebrow">Current status</p>
              <h2>{formatStatus(order.status)}</h2>
              <p>
                {order.paymentMethod} payment | Total {formatMoney(order.total)}
              </p>
            </div>
            <form className="admin-status-form" onSubmit={saveStatus}>
              <label>
                Order status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" disabled={statusSave.loading}>
                <Save size={16} />
                {statusSave.loading ? "Saving" : "Update Status"}
              </Button>
              {statusSave.error && (
                <p className="form-status form-status--error">{statusSave.error}</p>
              )}
              {statusSave.success && <p className="form-status">{statusSave.success}</p>}
            </form>
          </section>

          <section className="admin-detail-card">
            <h2>Items</h2>
            <div className="admin-order-items-table">
              {order.items.map((item) => (
                <div className="admin-order-detail-item" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      Qty {item.quantity}
                      {item.selectedColor ? ` | ${item.selectedColor}` : ""}
                      {item.selectedSize ? ` | Size ${item.selectedSize}` : ""}
                    </span>
                  </div>
                  <span>{formatMoney(item.price)}</span>
                  <strong>{formatMoney(item.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-detail-card">
            <h2>Internal Support Note</h2>
            <form className="admin-note-form" onSubmit={saveInternalNote}>
              <label>
                Note
                <textarea
                  value={internalNote}
                  maxLength={5000}
                  onChange={(event) => setInternalNote(event.target.value)}
                  placeholder="Add internal fulfillment, payment, or support context."
                />
              </label>
              <div className="admin-note-footer">
                <span>{internalNote.length}/5000</span>
                <Button type="submit" disabled={noteSave.loading}>
                  <Save size={16} />
                  {noteSave.loading ? "Saving" : "Save Note"}
                </Button>
              </div>
              {noteSave.error && (
                <p className="form-status form-status--error">{noteSave.error}</p>
              )}
              {noteSave.success && <p className="form-status">{noteSave.success}</p>}
            </form>
          </section>
        </div>

        <aside className="admin-order-detail-side">
          <section className="admin-detail-card">
            <h2>Totals</h2>
            <p>
              <span>Subtotal</span>
              <strong>{formatMoney(order.subtotal)}</strong>
            </p>
            <p>
              <span>Shipping</span>
              <strong>{order.shipping ? formatMoney(order.shipping) : "Free"}</strong>
            </p>
            <p>
              <span>Discount</span>
              <strong>{formatMoney(order.discount)}</strong>
            </p>
            <p>
              <span>Total</span>
              <strong>{formatMoney(order.total)}</strong>
            </p>
          </section>

          <section className="admin-detail-card">
            <h2>Customer</h2>
            <p>
              <span>Name</span>
              <strong>{order.customerName || "Guest customer"}</strong>
            </p>
            <p>
              <span>Email</span>
              <strong>{order.customerEmail || order.billing.email}</strong>
            </p>
            <p>
              <span>Payment</span>
              <strong>{order.paymentMethod}</strong>
            </p>
          </section>

          <section className="admin-detail-card">
            <h2>Billing</h2>
            <address>
              {billingLine(order).map((line) => (
                <span key={line}>{line}</span>
              ))}
            </address>
          </section>
        </aside>
      </section>
    </main>
  );
}
