import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { useGetAdminOrdersQuery } from '../api/ecommerceApi';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '../components/Button';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { formatMoney } from '../lib/format';
import type { AdminOrder, AsyncState, Navigate, PublicUser } from '../types';

type AdminOrdersPageProps = {
  userState: AsyncState<PublicUser | null>;
  navigate: Navigate;
};

const statusFilters = [
  { value: '', label: 'All statuses' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Pending';
}

function isStripeAttentionOrder(order: AdminOrder) {
  return (
    order.paymentMethod === 'stripe' &&
    (order.status === 'processing' || order.status === 'cancelled')
  );
}

export function AdminOrdersPage({ userState, navigate }: AdminOrdersPageProps) {
  const [status, setStatus] = useState('');
  const [email, setEmail] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');

  const canLoadOrders = userState.data?.role === 'admin';

  const { data, isLoading, error, refetch } = useGetAdminOrdersQuery(
    canLoadOrders
      ? {
          status: status || undefined,
          email: submittedEmail || undefined,
        }
      : undefined,
    {
      skip: !canLoadOrders,
      refetchOnMountOrArgChange: true,
    }
  );

  const orders = data?.orders || [];
  const total = data?.total || 0;
  const errorMessage = error ? (error as any).data?.message || 'Failed to load orders' : '';

  const attentionOrders = useMemo(() => orders.filter(isStripeAttentionOrder), [orders]);

  const submitEmailSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmittedEmail(email.trim());
  };

  if (userState.loading) {
    return (
      <main className="container page">
        <LoadingState title="Loading admin" message="We are checking your access." />
      </main>
    );
  }

  if (!userState.data) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Admin']} />
        <EmptyState
          title="Admin access requires sign in"
          message="Sign in with an administrator account to review orders."
          action={{ label: 'Sign In', onClick: () => navigate('/account') }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  if (userState.data.role !== 'admin') {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Admin']} />
        <ErrorState
          title="Admin access required"
          message="This order console is only available to administrators."
          action={{ label: 'View Account', onClick: () => navigate('/account') }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  return (
    <main className="container page admin-orders-page">
      <Breadcrumbs items={['Home', 'Admin', 'Orders']} />
      <section className="admin-orders-hero">
        <div>
          <p className="eyebrow">Admin console</p>
          <h1 className="page-title">Order payment watchlist</h1>
          <p>
            Review recent orders and quickly spot Stripe checkouts that are still processing or
            ended cancelled.
          </p>
        </div>
        <div className="admin-orders-metrics" aria-label="Order metrics">
          <span>
            <strong>{total}</strong>
            Total
          </span>
          <span className={attentionOrders.length ? 'is-alert' : ''}>
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
        <Button onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw size={16} />
          {isLoading ? 'Refreshing' : 'Refresh'}
        </Button>
      </section>

      {errorMessage && <p className="form-status form-status--error">{errorMessage}</p>}

      {!isLoading && !errorMessage && !orders.length && (
        <p className="admin-orders-empty">No orders match these filters.</p>
      )}

      <section className="admin-orders-list" aria-label="Admin order list">
        {orders.map((order) => {
          const needsReview = isStripeAttentionOrder(order);
          return (
            <article
              className={`admin-order-row ${needsReview ? 'admin-order-row--alert' : ''}`}
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
                <span>
                  {order.items.length} item{order.items.length === 1 ? '' : 's'}
                </span>
                <strong>{formatMoney(order.total)}</strong>
                <Button variant="ghost" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                  View Details
                </Button>
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
