import { useState, type FormEvent } from 'react';
import { ArrowLeft, RefreshCw, Save } from 'lucide-react';
import { useGetAdminOrderDetailQuery, useUpdateAdminOrderMutation } from '../api/ecommerceApi';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '../components/Button';
import { AdminNav } from '../components/AdminNav';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { formatMoney } from '../lib/format';
import type { AdminOrder, AsyncState, Navigate, PublicUser } from '../types';

type AdminOrderDetailPageProps = {
  id?: string;
  userState: AsyncState<PublicUser | null>;
  navigate: Navigate;
  currentPath: string;
};

const statusOptions = [
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

function billingLine(order: AdminOrder) {
  return [
    `${order.billing.firstName || ''} ${order.billing.lastName || ''}`.trim(),
    order.billing.streetAddress,
    order.billing.apartment,
    order.billing.townCity,
    order.billing.phone,
    order.billing.email,
  ].filter(Boolean);
}

export function AdminOrderDetailPage({ id, userState, navigate, currentPath }: AdminOrderDetailPageProps) {
  const canLoadOrder = userState.data?.role === 'admin';

  const { data, isLoading, error, refetch } = useGetAdminOrderDetailQuery(
    canLoadOrder && id ? id : '',
    {
      skip: !canLoadOrder || !id,
      refetchOnMountOrArgChange: true,
    }
  );

  const order = data?.order;
  const errorMessage = error ? (error as any).data?.message || 'Failed to load order' : '';
  const notFound = error && (error as any).status === 404;

  const [status, setStatus] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [updateAdminOrder, { isLoading: isUpdating }] = useUpdateAdminOrderMutation();
  const [statusSaveState, setStatusSaveState] = useState<{ error: string; success: string }>({
    error: '',
    success: '',
  });
  const [noteSaveState, setNoteSaveState] = useState<{ error: string; success: string }>({
    error: '',
    success: '',
  });

  // Sync local state when order data arrives
  if (order && status === '' && internalNote === '') {
    setStatus(order.status);
    setInternalNote(order.internalNote || '');
  }

  // Update local state when order loads
  const applyOrder = (nextOrder: AdminOrder) => {
    setStatus(nextOrder.status);
    setInternalNote(nextOrder.internalNote || '');
    // Clear success messages after showing them briefly
    setTimeout(() => {
      setStatusSaveState({ error: '', success: '' });
      setNoteSaveState({ error: '', success: '' });
    }, 2000);
  };

  const saveStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !order) return;
    setStatusSaveState({ error: '', success: '' });
    try {
      const result = await updateAdminOrder({
        id,
        updates: { status },
      }).unwrap();
      applyOrder(result.order);
      setStatusSaveState({ error: '', success: 'Status updated.' });
    } catch (err: any) {
      setStatusSaveState({
        error: err.data?.message || 'Failed to update status',
        success: '',
      });
    }
  };

  const saveInternalNote = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !order) return;
    setNoteSaveState({ error: '', success: '' });
    try {
      const result = await updateAdminOrder({
        id,
        updates: { internalNote },
      }).unwrap();
      applyOrder(result.order);
      setNoteSaveState({ error: '', success: 'Internal note saved.' });
    } catch (err: any) {
      setNoteSaveState({
        error: err.data?.message || 'Failed to save note',
        success: '',
      });
    }
  };

  if (userState.loading || isLoading) {
    return (
      <main className="container page">
        <LoadingState title="Loading admin order" message="We are getting the order details." />
      </main>
    );
  }

  if (!userState.data) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Admin', 'Orders']} />
        <EmptyState
          title="Admin access requires sign in"
          message="Sign in with an administrator account to review this order."
          action={{ label: 'Sign In', onClick: () => navigate('/login') }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  if (userState.data.role !== 'admin') {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Admin', 'Orders']} />
        <ErrorState
          title="Admin access required"
          message="This order detail is only available to administrators."
          action={{ label: 'View Account', onClick: () => navigate('/account') }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  if (!id || notFound) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Admin', 'Orders']} />
        <ErrorState
          title="Order not found"
          message="We could not find that admin order."
          action={{ label: 'Back To Orders', onClick: () => navigate('/admin/orders') }}
        />
      </main>
    );
  }

  if (errorMessage || !order) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Admin', 'Orders']} />
        <ErrorState
          title="We could not load this order"
          message={errorMessage}
          action={{ label: 'Try Again', onClick: () => refetch() }}
          secondaryAction={{ label: 'Back To Orders', onClick: () => navigate('/admin/orders') }}
        />
      </main>
    );
  }

  return (
    <main className="container page admin-order-detail-page">
      <Breadcrumbs items={['Home', 'Admin', 'Orders', order.id]} />
      <section className="admin-order-detail-hero">
        <div>
          <p className="eyebrow">Admin order detail</p>
          <h1 className="page-title">{order.id}</h1>
          <p>
            {order.customerName} | {order.customerEmail} | {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="admin-order-detail-actions">
          <Button variant="ghost" onClick={() => navigate('/admin/orders')}>
            <ArrowLeft size={16} />
            Back To Orders
          </Button>
          <Button variant="ghost" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>
      </section>
      <div style={{ marginTop: '24px' }}>
        <AdminNav currentPath={currentPath} navigate={navigate} />
      </div>

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
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" disabled={isUpdating}>
                <Save size={16} />
                {isUpdating ? 'Saving' : 'Update Status'}
              </Button>
              {statusSaveState.error && (
                <p className="form-status form-status--error">{statusSaveState.error}</p>
              )}
              {statusSaveState.success && <p className="form-status">{statusSaveState.success}</p>}
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
                      {item.selectedColor ? ` | ${item.selectedColor}` : ''}
                      {item.selectedSize ? ` | Size ${item.selectedSize}` : ''}
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
                <Button type="submit" disabled={isUpdating}>
                  <Save size={16} />
                  {isUpdating ? 'Saving' : 'Save Note'}
                </Button>
              </div>
              {noteSaveState.error && (
                <p className="form-status form-status--error">{noteSaveState.error}</p>
              )}
              {noteSaveState.success && <p className="form-status">{noteSaveState.success}</p>}
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
              <strong>{order.shipping ? formatMoney(order.shipping) : 'Free'}</strong>
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
              <strong>{order.customerName || 'Guest customer'}</strong>
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
