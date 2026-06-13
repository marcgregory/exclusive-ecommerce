import { useMemo, useState, type FormEvent } from 'react';
import { Edit3, Plus, RefreshCw, Save, Tag, Trash2, X } from 'lucide-react';
import {
  useCreateAdminCouponMutation,
  useDeleteAdminCouponMutation,
  useGetAdminCouponsQuery,
  useUpdateAdminCouponMutation,
} from '../api/ecommerceApi';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '../components/Button';
import { AdminNav } from '../components/AdminNav';
import { EmptyState, ErrorState, LoadingState } from '../components/StateViews';
import { getRtkErrorMessage } from '../lib/rtkErrors';
import { formatMoney } from '../lib/format';
import type {
  AdminCouponInput,
  AdminCouponResponse,
  AsyncState,
  Coupon,
  Navigate,
  PublicUser,
} from '../types';

type AdminCouponsPageProps = {
  userState: AsyncState<PublicUser | null>;
  navigate: Navigate;
  currentPath: string;
};

type CouponDraft = {
  code: string;
  type: Coupon['type'];
  amount: string;
  active: boolean;
};

const emptyDraft: CouponDraft = {
  code: '',
  type: 'percent',
  amount: '0',
  active: true,
};

function couponToDraft(coupon: Coupon): CouponDraft {
  return {
    code: coupon.code,
    type: coupon.type,
    amount: String(coupon.amount),
    active: coupon.active,
  };
}

function draftToPayload(draft: CouponDraft): AdminCouponInput {
  return {
    code: draft.code.trim().toUpperCase(),
    type: draft.type,
    amount: Number(draft.amount || 0),
    active: draft.active,
  };
}

function formatCouponValue(coupon: Coupon) {
  return coupon.type === 'percent' ? `${coupon.amount}% off` : `${formatMoney(coupon.amount)} off`;
}

export function AdminCouponsPage({ userState, navigate, currentPath }: AdminCouponsPageProps) {
  const {
    data: couponsData,
    isLoading: couponsLoading,
    error: couponsError,
    refetch: refetchCoupons,
  } = useGetAdminCouponsQuery(undefined, {
    skip: userState.data?.role !== 'admin',
  });

  const [createAdminCoupon, { isLoading: createSaving }] = useCreateAdminCouponMutation();
  const [updateAdminCoupon, { isLoading: updateSaving }] = useUpdateAdminCouponMutation();
  const [deleteAdminCoupon] = useDeleteAdminCouponMutation();

  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draft, setDraft] = useState<CouponDraft>(emptyDraft);
  const [deletingCode, setDeletingCode] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const couponsList = couponsData?.coupons ?? [];
  const couponsErrorMsg = couponsError ? getRtkErrorMessage(couponsError) : '';
  const saving = createSaving || updateSaving;

  const couponStats = useMemo(() => {
    const active = couponsList.filter((coupon) => coupon.active).length;
    return { active, inactive: couponsList.length - active };
  }, [couponsList]);

  const startCreate = () => {
    setEditingCode(null);
    setDraft(emptyDraft);
    setFormError('');
    setFormSuccess('');
  };

  const startEdit = (coupon: Coupon) => {
    setEditingCode(coupon.code);
    setDraft(couponToDraft(coupon));
    setFormError('');
    setFormSuccess('');
  };

  const submitCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      const payload = draftToPayload(draft);
      let data: AdminCouponResponse;
      if (editingCode) {
        data = await updateAdminCoupon({ code: editingCode, updates: payload }).unwrap();
      } else {
        data = await createAdminCoupon(payload).unwrap();
      }
      setEditingCode(data.coupon.code);
      setDraft(couponToDraft(data.coupon));
      setFormSuccess(editingCode ? 'Coupon updated.' : 'Coupon created.');
    } catch (error) {
      setFormError(getRtkErrorMessage(error));
    }
  };

  const deleteCoupon = async (coupon: Coupon) => {
    if (!window.confirm(`Delete ${coupon.code}?`)) return;
    setDeletingCode(coupon.code);
    setFormError('');
    setFormSuccess('');
    try {
      await deleteAdminCoupon(coupon.code).unwrap();
      if (editingCode === coupon.code) startCreate();
      setFormSuccess('Coupon deleted.');
    } catch (error) {
      setFormError(getRtkErrorMessage(error));
    } finally {
      setDeletingCode('');
    }
  };

  const updateDraft = <K extends keyof CouponDraft>(key: K, value: CouponDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
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
        <Breadcrumbs items={['Home', 'Admin', 'Coupons']} />
        <EmptyState
          title="Admin access requires sign in"
          message="Sign in with an administrator account to manage coupons."
          action={{ label: 'Sign In', onClick: () => navigate('/login') }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  if (userState.data.role !== 'admin') {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'Admin', 'Coupons']} />
        <ErrorState
          title="Admin access required"
          message="Coupon management is only available to administrators."
          action={{ label: 'View Account', onClick: () => navigate('/account') }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  return (
    <main className="container page admin-catalog-page">
      <Breadcrumbs items={['Home', 'Admin', 'Coupons']} />
      <section className="admin-orders-hero">
        <div>
          <p className="eyebrow">Admin console</p>
          <h1 className="page-title">Coupon management</h1>
          <p>
            Create checkout discounts, retire expired codes, and keep active promotions visible to
            the catalog team.
          </p>
        </div>
        <AdminNav currentPath={currentPath} navigate={navigate} />
      </section>

      <section className="admin-orders-toolbar" aria-label="Coupon tools">
        <Button onClick={refetchCoupons} disabled={couponsLoading}>
          <RefreshCw size={16} />
          {couponsLoading ? 'Refreshing' : 'Refresh'}
        </Button>
        <Button onClick={startCreate}>
          <Plus size={16} />
          New Coupon
        </Button>
        <span className="admin-catalog-count">{couponsList.length} coupons</span>
        <span className="admin-catalog-count">{couponStats.active} active</span>
        <span className="admin-catalog-count">{couponStats.inactive} inactive</span>
      </section>

      {couponsErrorMsg && <p className="form-status form-status--error">{couponsErrorMsg}</p>}
      {formError && <p className="form-status form-status--error">{formError}</p>}
      {formSuccess && <p className="form-status form-status--success">{formSuccess}</p>}

      <section className="admin-catalog-layout">
        <div className="admin-catalog-list" aria-label="Admin coupon list">
          {!couponsLoading && !couponsErrorMsg && !couponsList.length && (
            <p className="admin-orders-empty">No coupons are configured.</p>
          )}
          {couponsList.map((coupon) => (
            <article className="admin-catalog-row admin-coupon-row" key={coupon.code}>
              <div className="admin-catalog-row__main">
                <strong>{coupon.code}</strong>
                <span>{coupon.active ? 'Active at checkout' : 'Inactive'}</span>
              </div>
              <div className="admin-catalog-row__meta">
                <span>{coupon.type === 'percent' ? 'Percent' : 'Fixed'}</span>
                <strong>{formatCouponValue(coupon)}</strong>
                <span
                  className={
                    coupon.active ? 'admin-status-pill--active' : 'admin-status-pill--inactive'
                  }
                >
                  {coupon.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="admin-catalog-row__actions">
                <Button variant="ghost" onClick={() => startEdit(coupon)}>
                  <Edit3 size={16} />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => deleteCoupon(coupon)}
                  disabled={deletingCode === coupon.code}
                >
                  <Trash2 size={16} />
                  {deletingCode === coupon.code ? 'Deleting' : 'Delete'}
                </Button>
              </div>
            </article>
          ))}
        </div>

        <aside className="admin-catalog-form-card">
          <div className="admin-catalog-form-card__header">
            <div>
              <p className="eyebrow">{editingCode ? 'Edit coupon' : 'Create coupon'}</p>
              <h2>{editingCode || 'New coupon'}</h2>
            </div>
            {editingCode && (
              <Button variant="ghost" onClick={startCreate}>
                <X size={16} />
                Clear
              </Button>
            )}
          </div>
          <form className="admin-catalog-form" onSubmit={submitCoupon}>
            <label className="admin-catalog-form__wide">
              Code
              <input
                value={draft.code}
                onChange={(event) => updateDraft('code', event.target.value.toUpperCase())}
                placeholder="SAVE20"
                disabled={Boolean(editingCode)}
                required
              />
            </label>
            <label>
              Discount type
              <select
                value={draft.type}
                onChange={(event) => updateDraft('type', event.target.value as Coupon['type'])}
              >
                <option value="percent">Percent</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </label>
            <label>
              Amount
              <input
                type="number"
                min="0"
                max={draft.type === 'percent' ? 100 : undefined}
                step={draft.type === 'percent' ? 1 : 0.01}
                value={draft.amount}
                onChange={(event) => updateDraft('amount', event.target.value)}
              />
            </label>
            <label className="admin-catalog-check">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) => updateDraft('active', event.target.checked)}
              />
              Active at checkout
            </label>
            <div className="admin-catalog-form__actions">
              <Button type="submit" disabled={saving}>
                {editingCode ? <Save size={16} /> : <Tag size={16} />}
                {saving ? 'Saving' : editingCode ? 'Update Coupon' : 'Create Coupon'}
              </Button>
            </div>
          </form>
        </aside>
      </section>
    </main>
  );
}
