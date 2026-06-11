import { useEffect, useState, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  useGetOrdersQuery,
  useGoogleAuthMutation,
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
import { useGoogleLogin } from '@react-oauth/google';

type AccountPageProps = {
  userState: AsyncState<PublicUser | null>;
  onAuthChanged: (user: PublicUser) => void;
  onUserRefresh: () => Promise<void>;
  navigate: Navigate;
  authModeQuery?: string | null;
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
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value)
  );
}

function formatOrderStatus(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Pending';
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.87 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9.02 9.02 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.17 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

export function AccountPage({
  userState,
  onAuthChanged,
  onUserRefresh,
  navigate,
  authModeQuery,
}: AccountPageProps) {
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [authStatus, setAuthStatus] = useState('');
  const [authStatusIsError, setAuthStatusIsError] = useState(false);
  const [profileStatus, setProfileStatus] = useState('');
  const [profileStatusIsError, setProfileStatusIsError] = useState(false);

  // Sync authMode with URL query parameter
  useEffect(() => {
    const newMode =
      authModeQuery === 'login' || authModeQuery === 'register' ? authModeQuery : 'register';
    setAuthMode(newMode);
  }, [authModeQuery]);

  const toggleAuthMode = useCallback(() => {
    setAuthStatus('');
    setAuthStatusIsError(false);
    const newMode = authMode === 'login' ? 'register' : 'login';
    setAuthMode(newMode);
    navigate(`/account?mode=${newMode}`);
  }, [authMode, navigate]);
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
  const [googleAuth] = useGoogleAuthMutation();
  const [updateProfile, updateProfileState] = useUpdateProfileMutation();
  const googleLogin = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: async (codeResponse) => {
      try {
        const result = await googleAuth({ code: codeResponse.code }).unwrap();
        onAuthChanged(result.user);
      } catch {
        console.error('Google login failed');
      }
    },
    onError: () => {
      console.error('Google login failed');
    },
  });

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
            <p>{authMode === 'login' ? 'Enter your details below' : 'Enter your details below'}</p>
          </div>
          <form className="signup-form" onSubmit={submitAuth}>
            {authMode === 'register' && (
              <label className="signup-field">
                <span className="sr-only">Name</span>
                <input
                  placeholder="First name"
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
              <span className="sr-only">Email or Phone Number</span>
              <input
                placeholder="Email or phone number"
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
              <span className="sr-only">Password</span>
              <input
                placeholder="Password"
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
            {googleClientId && (
              <button type="button" className="google-btn" onClick={() => googleLogin()}>
                <GoogleIcon />
                <span>{authMode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}</span>
              </button>
            )}
            {!googleClientId && (
              <p className="signup-help">Google sign-in needs VITE_GOOGLE_CLIENT_ID.</p>
            )}
            <div className="signup-switch">
              <span>{authMode === 'login' ? 'Need an account?' : 'Already have account?'}</span>
              <button type="button" onClick={toggleAuthMode}>
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
