import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useGetOrdersQuery, useUpdateProfileMutation } from '../api/ecommerceApi';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { ErrorState } from '../components/StateViews';
import { formatMoney } from '../lib/format';
import { getRtkErrorMessage } from '../lib/rtkErrors';
import { useScrollSpy } from '../lib/useScrollSpy';
import type { AsyncState, Navigate, PublicUser } from '../types';
import { OrderSkeleton } from '../components/skeletons/OrderSkeleton';
import { AccountPageSkeleton } from '../components/skeletons/AccountPageSkeleton';

/** All section IDs in the account page, in DOM order */
const ACCOUNT_SECTION_IDS = [
  'profile',
  'orders',
  'returns',
  'cancellations',
  'reviews',
  'address-book',
  'payment-options',
] as const;

type AccountPageProps = {
  userState: AsyncState<PublicUser | null>;
  onAuthChanged: (user: PublicUser) => void;
  onUserRefresh: () => Promise<void>;
  navigate: Navigate;
};

const profileSchema = z.object({
  firstName: z.string().trim().optional().default(''),
  lastName: z.string().trim().optional().default(''),
  email: z.string().trim().email('Enter a valid email address'),
  address: z.string().trim().optional().default(''),
  currentPassword: z.string().optional().default(''),
  newPassword: z.string().optional().default(''),
  confirmPassword: z.string().optional().default(''),
});

type ProfileFormInput = z.input<typeof profileSchema>;
type ProfileForm = z.output<typeof profileSchema>;

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value)
  );
}

function formatOrderStatus(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Pending';
}

export function AccountPage({
  userState,
  onAuthChanged,
  onUserRefresh,
  navigate,
}: AccountPageProps) {
  const sectionIds = useMemo(() => [...ACCOUNT_SECTION_IDS], []);
  const { activeId, scrollTo } = useScrollSpy(sectionIds);

  const [profileStatus, setProfileStatus] = useState('');
  const [profileStatusIsError, setProfileStatusIsError] = useState(false);

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useGetOrdersQuery(undefined, {
    skip: !userState.data,
  });
  const [updateProfile, updateProfileState] = useUpdateProfileMutation();

  const orders = ordersData?.orders ?? [];
  const ordersErrorMessage = ordersError ? getRtkErrorMessage(ordersError) : '';

  const profileForm = useForm<ProfileFormInput, unknown, ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const submitProfile = profileForm.handleSubmit(async (payload) => {
    const nextPayload = { ...payload };

    // Strip empty password fields so the backend doesn't treat a non-password
    // profile save as an attempted password change (it requires all three
    // password fields once any of them is present).
    for (const key of ['currentPassword', 'newPassword', 'confirmPassword'] as const) {
      if (!nextPayload[key]) delete nextPayload[key];
    }

    try {
      setProfileStatus('');
      setProfileStatusIsError(false);
      const result = await updateProfile(nextPayload).unwrap();
      onAuthChanged(result.user);
      setProfileStatus('Profile saved.');
      profileForm.reset({
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        address: result.user.address,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      setProfileStatusIsError(true);
      setProfileStatus(getRtkErrorMessage(error));
    }
  });

  if (userState.loading) {
    return <AccountPageSkeleton />;
  }

  if (userState.error) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'My Account']} />
        <ErrorState
          title="We could not load your account"
          message={userState.error}
          action={{ label: 'Try Again', onClick: onUserRefresh }}
          secondaryAction={{ label: 'Return To Shop', onClick: () => navigate('/') }}
        />
      </main>
    );
  }

  if (!userState.data) {
    return (
      <main className="container page">
        <Breadcrumbs items={['Home', 'My Account']} />
        <ErrorState
          title="Sign in to view your account"
          message="Your profile, orders, and account settings are available after you log in."
          action={{ label: 'Login', onClick: () => navigate('/login') }}
          secondaryAction={{ label: 'Create Account', onClick: () => navigate('/signup') }}
        />
      </main>
    );
  }

  const user = userState.data;

  return (
    <main className="container page">
      <Breadcrumbs items={['Home', 'My Account']} />
      <p className="welcome">
        Welcome!{' '}
        <strong>
          {user.firstName || 'Customer'} {user.lastName}
        </strong>
      </p>
      <div className="account-layout">
        <aside className="account-menu">
          <h3>Manage My Account</h3>
          <button
            type="button"
            className={activeId === 'profile' ? 'active' : ''}
            onClick={() => { scrollTo('profile'); navigate('/account#profile'); }}
          >
            My Profile
          </button>
          <button
            type="button"
            className={activeId === 'address-book' ? 'active' : ''}
            onClick={() => { scrollTo('address-book'); navigate('/account#address-book'); }}
          >
            Address Book
          </button>
          <button
            type="button"
            className={activeId === 'payment-options' ? 'active' : ''}
            onClick={() => { scrollTo('payment-options'); navigate('/account#payment-options'); }}
          >
            My Payment Options
          </button>
          <h3>My Orders</h3>
          <button
            type="button"
            className={activeId === 'orders' ? 'active' : ''}
            onClick={() => { scrollTo('orders'); navigate('/account#orders'); }}
          >
            My Orders
          </button>
          <button
            type="button"
            className={activeId === 'returns' ? 'active' : ''}
            onClick={() => { scrollTo('returns'); navigate('/account#returns'); }}
          >
            My Returns
          </button>
          <button
            type="button"
            className={activeId === 'cancellations' ? 'active' : ''}
            onClick={() => { scrollTo('cancellations'); navigate('/account#cancellations'); }}
          >
            My Cancellations
          </button>
          <h3>My WishList</h3>
          <button type="button" onClick={() => navigate('/wishlist')}>
            Saved Products
          </button>
        </aside>
        <div className="account-content">
          <form className="profile-card account-section" id="profile" onSubmit={submitProfile}>
            <h2>Edit Your Profile</h2>
            <div className="two-col">
              <FormField
                label="First Name"
                name="firstName"
                defaultValue={user.firstName}
                register={profileForm.register('firstName')}
                error={profileForm.formState.errors.firstName?.message}
              />
              <FormField
                label="Last Name"
                name="lastName"
                defaultValue={user.lastName}
                register={profileForm.register('lastName')}
                error={profileForm.formState.errors.lastName?.message}
              />
              <FormField
                label="Email"
                name="email"
                type="email"
                defaultValue={user.email}
                register={profileForm.register('email')}
                error={profileForm.formState.errors.email?.message}
              />
              <FormField
                label="Address"
                name="address"
                defaultValue={user.address}
                register={profileForm.register('address')}
                error={profileForm.formState.errors.address?.message}
              />
            </div>
            <div className="password-grid">
              <FormField
                label="Current Password"
                name="currentPassword"
                type="password"
                register={profileForm.register('currentPassword')}
                error={profileForm.formState.errors.currentPassword?.message}
              />
              <FormField
                label="New Password"
                name="newPassword"
                type="password"
                register={profileForm.register('newPassword')}
                error={profileForm.formState.errors.newPassword?.message}
              />
              <FormField
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                register={profileForm.register('confirmPassword')}
                error={profileForm.formState.errors.confirmPassword?.message}
              />
            </div>
            <div className="form-actions">
              <Button variant="ghost" type="button" onClick={onUserRefresh}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateProfileState.isLoading}>
                {updateProfileState.isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
            {profileStatus && (
              <p className={`form-status ${profileStatusIsError ? 'form-status--error' : ''}`}>
                {profileStatus}
              </p>
            )}
          </form>

          <section className="profile-card order-history account-section" id="orders">
            {ordersLoading ? (
              <OrderSkeleton />
            ) : (
              <>
                <div className="order-history__header">
                  <h2>Order History</h2>
                  <Button variant="ghost" onClick={() => refetchOrders()} disabled={ordersLoading}>
                    {ordersLoading ? 'Refreshing...' : 'Refresh'}
                  </Button>
                </div>
                {ordersErrorMessage && (
                  <p className="form-status form-status--error">{ordersErrorMessage}</p>
                )}
                {!ordersLoading && !ordersErrorMessage && !orders.length && (
                  <p className="order-history__empty">Orders you place will appear here.</p>
                )}
                {orders.map((order) => (
                  <article className="order-history__row" key={order.id}>
                    <div>
                      <strong>{order.id}</strong>
                      <span>
                        {formatOrderDate(order.createdAt)} | {formatOrderStatus(order.status)} |{' '}
                        {order.items.length} item{order.items.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    <strong>{formatMoney(order.total)}</strong>
                    <Button variant="ghost" onClick={() => navigate(`/orders/${order.id}`)}>
                      View Details
                    </Button>
                  </article>
                ))}
              </>
            )}
          </section>
          <section className="profile-card account-section" id="returns">
            <h2>My Returns</h2>
            <p className="order-history__empty">Return requests will appear here.</p>
          </section>
          <section className="profile-card account-section" id="cancellations">
            <h2>My Cancellations</h2>
            <p className="order-history__empty">Cancelled orders will appear here.</p>
          </section>
          <section className="profile-card account-section" id="reviews">
            <h2>My Reviews</h2>
            <p className="order-history__empty">Product reviews you write will appear here.</p>
          </section>
          <section className="profile-card account-section" id="address-book">
            <h2>Address Book</h2>
            <p className="order-history__empty">Use your profile address for checkout.</p>
          </section>
          <section className="profile-card account-section" id="payment-options">
            <h2>My Payment Options</h2>
            <p className="order-history__empty">Saved payment methods will appear here.</p>
          </section>
        </div>
      </div>
    </main>
  );
}
