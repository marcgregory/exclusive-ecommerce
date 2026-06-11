import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  useGetOrdersQuery,
  useLoginMutation,
  useRegisterMutation,
  useUpdateProfileMutation,
} from '../api/ecommerceApi';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { ErrorState } from '../components/StateViews';
import { formatMoney } from '../lib/format';
import { getRtkErrorMessage } from '../lib/rtkErrors';
import type { AsyncState, Navigate, PublicUser } from '../types';
import { OrderSkeleton } from '../components/skeletons/OrderSkeleton';
import { AccountPageSkeleton } from '../components/skeletons/AccountPageSkeleton';

type AccountPageProps = {
  userState: AsyncState<PublicUser | null>;
  onAuthChanged: (user: PublicUser) => void;
  onUserRefresh: () => Promise<void>;
  navigate: Navigate;
};

type AuthMode = 'login' | 'register';

const authSchema = z.object({
  firstName: z.string().trim().optional().default(''),
  lastName: z.string().trim().optional().default(''),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  confirmPassword: z.string().optional().default(''),
  address: z.string().trim().optional().default(''),
});

const profileSchema = z.object({
  firstName: z.string().trim().optional().default(''),
  lastName: z.string().trim().optional().default(''),
  email: z.string().trim().email('Enter a valid email address'),
  address: z.string().trim().optional().default(''),
  currentPassword: z.string().optional().default(''),
  newPassword: z.string().optional().default(''),
  confirmPassword: z.string().optional().default(''),
});

type AuthFormInput = z.input<typeof authSchema>;
type AuthForm = z.output<typeof authSchema>;
type ProfileFormInput = z.input<typeof profileSchema>;
type ProfileForm = z.output<typeof profileSchema>;

const signupSideImage = 'https://www.figma.com/api/mcp/asset/d608e25b-65c2-421f-96da-b54acb84e61f';

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
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [authStatus, setAuthStatus] = useState('');
  const [authStatusIsError, setAuthStatusIsError] = useState(false);
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

  const [register, registerState] = useRegisterMutation();
  const [login, loginState] = useLoginMutation();
  const [updateProfile, updateProfileState] = useUpdateProfileMutation();

  const orders = ordersData?.orders ?? [];
  const ordersErrorMessage = ordersError ? getRtkErrorMessage(ordersError) : '';

  const authForm = useForm<AuthFormInput, unknown, AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      address: '',
    },
  });
  const profileForm = useForm<ProfileFormInput, unknown, ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const submitAuth = authForm.handleSubmit(async (payload) => {
    try {
      setAuthStatus('');
      setAuthStatusIsError(false);
      const mutationFn = authMode === 'login' ? login : register;
      const result = await mutationFn({
        ...payload,
        confirmPassword: authMode === 'register' ? payload.password : payload.confirmPassword,
      }).unwrap();
      onAuthChanged(result.user);
      setAuthStatus(authMode === 'login' ? 'Signed in.' : 'Account created.');
    } catch (error) {
      setAuthStatusIsError(true);
      setAuthStatus(getRtkErrorMessage(error));
    }
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
      <main className="signup-page" aria-labelledby="signup-title">
        <section className="signup-visual" aria-hidden="true">
          <img src={signupSideImage} alt="" />
        </section>
        <section className="signup-panel">
          <div className="signup-panel__intro">
            <h1 id="signup-title">
              {authMode === 'login' ? 'Log in to Exclusive' : 'Create an account'}
            </h1>
            <p>
              {authMode === 'login' ? 'Enter your details below' : 'Enter your details below'}
            </p>
          </div>
          <form className="signup-form" onSubmit={submitAuth}>
            {authMode === 'register' && (
              <label className="signup-field">
                <span>Name</span>
                <input
                  autoComplete="name"
                  {...authForm.register('firstName')}
                  aria-invalid={Boolean(authForm.formState.errors.firstName)}
                />
                {authForm.formState.errors.firstName?.message && (
                  <small>{authForm.formState.errors.firstName.message}</small>
                )}
              </label>
            )}
            <label className="signup-field">
              <span>Email or Phone Number</span>
              <input
                type="email"
                autoComplete="email"
                {...authForm.register('email')}
                aria-invalid={Boolean(authForm.formState.errors.email)}
              />
              {authForm.formState.errors.email?.message && (
                <small>{authForm.formState.errors.email.message}</small>
              )}
            </label>
            <label className="signup-field">
              <span>Password</span>
              <input
                type="password"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                {...authForm.register('password')}
                aria-invalid={Boolean(authForm.formState.errors.password)}
              />
              {authForm.formState.errors.password?.message && (
                <small>{authForm.formState.errors.password.message}</small>
              )}
            </label>
            <Button
              className="signup-submit"
              type="submit"
              disabled={registerState.isLoading || loginState.isLoading}
            >
              {registerState.isLoading || loginState.isLoading
                ? 'Please wait...'
                : authMode === 'login'
                  ? 'Log In'
                  : 'Create Account'}
            </Button>
            {authMode === 'register' && (
              <button className="google-signup-button" type="button">
                <span aria-hidden="true">G</span>
                Sign up with Google
              </button>
            )}
            <div className="signup-switch">
              <span>
                {authMode === 'login' ? 'Need an account?' : 'Already have account?'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setAuthStatus('');
                  setAuthStatusIsError(false);
                  setAuthMode(authMode === 'login' ? 'register' : 'login');
                }}
              >
                {authMode === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </div>
            {authStatus && (
              <p className={`form-status ${authStatusIsError ? 'form-status--error' : ''}`}>
                {authStatus}
              </p>
            )}
          </form>
        </section>
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
          <p>My Profile</p>
          <p>Address Book</p>
          <p>My Payment Options</p>
          <h3>My Orders</h3>
          <p>My Returns</p>
          <p>My Cancellations</p>
          <h3>My WishList</h3>
        </aside>
        <div className="account-content">
          <form className="profile-card" onSubmit={submitProfile}>
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

          <section className="profile-card order-history">
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
        </div>
      </div>
    </main>
  );
}
