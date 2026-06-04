import { type FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import { formatMoney } from "../lib/format";
import type { AsyncState, AuthResponse, Navigate, Order, OrdersResponse, PublicUser } from "../types";

type AccountPageProps = {
  userState: AsyncState<PublicUser | null>;
  onAuthChanged: (user: PublicUser) => void;
  onUserRefresh: () => Promise<void>;
  navigate: Navigate;
};

type AuthMode = "login" | "register";

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatOrderStatus(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Pending";
}

export function AccountPage({ userState, onAuthChanged, onUserRefresh, navigate }: AccountPageProps) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authStatus, setAuthStatus] = useState("");
  const [authStatusIsError, setAuthStatusIsError] = useState(false);
  const [profileStatus, setProfileStatus] = useState("");
  const [profileStatusIsError, setProfileStatusIsError] = useState(false);
  const [savingAuth, setSavingAuth] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [ordersState, setOrdersState] = useState<AsyncState<Order[]>>({ data: [], loading: false, error: "" });

  const loadOrders = useCallback(async () => {
    if (!userState.data) {
      setOrdersState({ data: [], loading: false, error: "" });
      return;
    }
    setOrdersState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<OrdersResponse>("/api/orders");
      setOrdersState({ data: data.orders, loading: false, error: "" });
    } catch (error) {
      setOrdersState((current) => ({ ...current, loading: false, error: getErrorMessage(error) }));
    }
  }, [userState.data]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";

    try {
      setSavingAuth(true);
      setAuthStatus("");
      setAuthStatusIsError(false);
      const data = await api<AuthResponse>(endpoint, { method: "POST", body: JSON.stringify(payload) });
      onAuthChanged(data.user);
      setAuthStatus(authMode === "login" ? "Signed in." : "Account created.");
    } catch (error) {
      setAuthStatusIsError(true);
      setAuthStatus(getErrorMessage(error));
    } finally {
      setSavingAuth(false);
    }
  };

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());

    // Strip empty password fields so the backend doesn't treat a non-password
    // profile save as an attempted password change (it requires all three
    // password fields once any of them is present).
    for (const key of ["currentPassword", "newPassword", "confirmPassword"] as const) {
      if (!payload[key]) delete payload[key];
    }

    try {
      setSavingProfile(true);
      setProfileStatus("");
      setProfileStatusIsError(false);
      const data = await api<AuthResponse>("/api/me", { method: "PATCH", body: JSON.stringify(payload) });
      onAuthChanged(data.user);
      setProfileStatus("Profile saved.");
      form.querySelectorAll<HTMLInputElement>("input[type='password']").forEach((input) => {
        input.value = "";
      });
    } catch (error) {
      setProfileStatusIsError(true);
      setProfileStatus(getErrorMessage(error));
    } finally {
      setSavingProfile(false);
    }
  };

  if (userState.loading) {
    return <main className="container page"><LoadingState title="Loading account" message="We are checking your account." /></main>;
  }

  if (userState.error) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "My Account"]} />
        <ErrorState
          title="We could not load your account"
          message={userState.error}
          action={{ label: "Try Again", onClick: onUserRefresh }}
          secondaryAction={{ label: "Return To Shop", onClick: () => navigate("/") }}
        />
      </main>
    );
  }

  if (!userState.data) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "My Account"]} />
        <div className="auth-layout">
          <EmptyState
            title="Sign in to continue"
            message="Use your account to manage your cart, wishlist, checkout, and profile."
            action={{ label: "Sign In", onClick: () => setAuthMode("login") }}
            secondaryAction={{ label: "Create Account", onClick: () => setAuthMode("register") }}
          />
          <form className="profile-card auth-card" onSubmit={submitAuth}>
            <h2>{authMode === "login" ? "Sign In" : "Create Account"}</h2>
            {authMode === "register" && (
              <div className="two-col">
                <FormField label="First Name" name="firstName" />
                <FormField label="Last Name" name="lastName" />
              </div>
            )}
            <FormField label="Email" name="email" type="email" required />
            <FormField label="Password" name="password" type="password" required />
            {authMode === "register" && (
              <>
                <FormField label="Confirm Password" name="confirmPassword" type="password" required />
                <FormField label="Address" name="address" />
              </>
            )}
            <div className="form-actions">
              <button type="button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
                {authMode === "login" ? "Create account" : "Sign in instead"}
              </button>
              <Button type="submit" disabled={savingAuth}>{savingAuth ? "Please wait..." : authMode === "login" ? "Sign In" : "Create Account"}</Button>
            </div>
            {authStatus && <p className={`form-status ${authStatusIsError ? "form-status--error" : ""}`}>{authStatus}</p>}
          </form>
        </div>
      </main>
    );
  }

  const user = userState.data;

  return (
    <main className="container page">
      <Breadcrumbs items={["Home", "My Account"]} />
      <p className="welcome">Welcome! <strong>{user.firstName || "Customer"} {user.lastName}</strong></p>
      <div className="account-layout">
        <aside className="account-menu"><h3>Manage My Account</h3><p>My Profile</p><p>Address Book</p><p>My Payment Options</p><h3>My Orders</h3><p>My Returns</p><p>My Cancellations</p><h3>My WishList</h3></aside>
        <div className="account-content">
          <form className="profile-card" onSubmit={submitProfile}>
            <h2>Edit Your Profile</h2>
            <div className="two-col">
              <FormField label="First Name" name="firstName" defaultValue={user.firstName} />
              <FormField label="Last Name" name="lastName" defaultValue={user.lastName} />
              <FormField label="Email" name="email" type="email" defaultValue={user.email} />
              <FormField label="Address" name="address" defaultValue={user.address} />
            </div>
            <div className="password-grid">
              <FormField label="Current Password" name="currentPassword" type="password" />
              <FormField label="New Password" name="newPassword" type="password" />
              <FormField label="Confirm New Password" name="confirmPassword" type="password" />
            </div>
            <div className="form-actions"><button type="button" onClick={onUserRefresh}>Cancel</button><Button type="submit" disabled={savingProfile}>{savingProfile ? "Saving..." : "Save Changes"}</Button></div>
            {profileStatus && <p className={`form-status ${profileStatusIsError ? "form-status--error" : ""}`}>{profileStatus}</p>}
          </form>

          <section className="profile-card order-history">
            <div className="order-history__header">
              <h2>Order History</h2>
              <Button variant="ghost" onClick={loadOrders} disabled={ordersState.loading}>{ordersState.loading ? "Refreshing..." : "Refresh"}</Button>
            </div>
            {ordersState.error && <p className="form-status form-status--error">{ordersState.error}</p>}
            {!ordersState.loading && !ordersState.error && !ordersState.data.length && (
              <p className="order-history__empty">Orders you place will appear here.</p>
            )}
            {ordersState.data.map((order) => (
              <article className="order-history__row" key={order.id}>
                <div>
                  <strong>{order.id}</strong>
                  <span>{formatOrderDate(order.createdAt)} | {formatOrderStatus(order.status)} | {order.items.length} item{order.items.length === 1 ? "" : "s"}</span>
                </div>
                <strong>{formatMoney(order.total)}</strong>
                <Button variant="ghost" onClick={() => navigate(`/orders/${order.id}`)}>View Details</Button>
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
