import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api } from "../api/client";
import { useGetOrdersQuery } from "../api/ecommerceApi";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { EmptyState, ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import { formatMoney } from "../lib/format";
import { getRtkErrorMessage } from "../lib/rtkErrors";
import type { AsyncState, AuthResponse, Navigate, PublicUser } from "../types";

type AccountPageProps = {
  userState: AsyncState<PublicUser | null>;
  onAuthChanged: (user: PublicUser) => void;
  onUserRefresh: () => Promise<void>;
  navigate: Navigate;
};

type AuthMode = "login" | "register";

const authSchema = z.object({
  firstName: z.string().trim().optional().default(""),
  lastName: z.string().trim().optional().default(""),
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  confirmPassword: z.string().optional().default(""),
  address: z.string().trim().optional().default(""),
});

const profileSchema = z.object({
  firstName: z.string().trim().optional().default(""),
  lastName: z.string().trim().optional().default(""),
  email: z.string().trim().email("Enter a valid email address"),
  address: z.string().trim().optional().default(""),
  currentPassword: z.string().optional().default(""),
  newPassword: z.string().optional().default(""),
  confirmPassword: z.string().optional().default(""),
});

type AuthFormInput = z.input<typeof authSchema>;
type AuthForm = z.output<typeof authSchema>;
type ProfileFormInput = z.input<typeof profileSchema>;
type ProfileForm = z.output<typeof profileSchema>;

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
  
  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useGetOrdersQuery(undefined, {
    skip: !userState.data,
  });

  const orders = ordersData?.orders ?? [];
  const ordersErrorMessage = ordersError ? getRtkErrorMessage(ordersError) : "";

  const authForm = useForm<AuthFormInput, unknown, AuthForm>({
    resolver: zodResolver(authSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "", address: "" },
  });
  const profileForm = useForm<ProfileFormInput, unknown, ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const submitAuth = authForm.handleSubmit(async (payload) => {
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";

    try {
      setAuthStatus("");
      setAuthStatusIsError(false);
      const data = await api<AuthResponse>(endpoint, { method: "POST", body: JSON.stringify(payload) });
      onAuthChanged(data.user);
      setAuthStatus(authMode === "login" ? "Signed in." : "Account created.");
    } catch (error) {
      setAuthStatusIsError(true);
      setAuthStatus(getErrorMessage(error));
    }
  });

  const submitProfile = profileForm.handleSubmit(async (payload) => {
    const nextPayload = { ...payload };

    // Strip empty password fields so the backend doesn't treat a non-password
    // profile save as an attempted password change (it requires all three
    // password fields once any of them is present).
    for (const key of ["currentPassword", "newPassword", "confirmPassword"] as const) {
      if (!nextPayload[key]) delete nextPayload[key];
    }

    try {
      setProfileStatus("");
      setProfileStatusIsError(false);
      const data = await api<AuthResponse>("/api/me", { method: "PATCH", body: JSON.stringify(nextPayload) });
      onAuthChanged(data.user);
      setProfileStatus("Profile saved.");
      profileForm.reset({
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        email: data.user.email,
        address: data.user.address,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setProfileStatusIsError(true);
      setProfileStatus(getErrorMessage(error));
    }
  });

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
                <FormField label="First Name" name="firstName" register={authForm.register("firstName")} error={authForm.formState.errors.firstName?.message} />
                <FormField label="Last Name" name="lastName" register={authForm.register("lastName")} error={authForm.formState.errors.lastName?.message} />
              </div>
            )}
            <FormField label="Email" name="email" type="email" required register={authForm.register("email")} error={authForm.formState.errors.email?.message} />
            <FormField label="Password" name="password" type="password" required register={authForm.register("password")} error={authForm.formState.errors.password?.message} />
            {authMode === "register" && (
              <>
                <FormField label="Confirm Password" name="confirmPassword" type="password" required register={authForm.register("confirmPassword")} error={authForm.formState.errors.confirmPassword?.message} />
                <FormField label="Address" name="address" register={authForm.register("address")} error={authForm.formState.errors.address?.message} />
              </>
            )}
            <div className="form-actions">
              <button type="button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
                {authMode === "login" ? "Create account" : "Sign in instead"}
              </button>
              <Button type="submit" disabled={authForm.formState.isSubmitting}>{authForm.formState.isSubmitting ? "Please wait..." : authMode === "login" ? "Sign In" : "Create Account"}</Button>
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
              <FormField label="First Name" name="firstName" defaultValue={user.firstName} register={profileForm.register("firstName")} error={profileForm.formState.errors.firstName?.message} />
              <FormField label="Last Name" name="lastName" defaultValue={user.lastName} register={profileForm.register("lastName")} error={profileForm.formState.errors.lastName?.message} />
              <FormField label="Email" name="email" type="email" defaultValue={user.email} register={profileForm.register("email")} error={profileForm.formState.errors.email?.message} />
              <FormField label="Address" name="address" defaultValue={user.address} register={profileForm.register("address")} error={profileForm.formState.errors.address?.message} />
            </div>
            <div className="password-grid">
              <FormField label="Current Password" name="currentPassword" type="password" register={profileForm.register("currentPassword")} error={profileForm.formState.errors.currentPassword?.message} />
              <FormField label="New Password" name="newPassword" type="password" register={profileForm.register("newPassword")} error={profileForm.formState.errors.newPassword?.message} />
              <FormField label="Confirm New Password" name="confirmPassword" type="password" register={profileForm.register("confirmPassword")} error={profileForm.formState.errors.confirmPassword?.message} />
            </div>
            <div className="form-actions"><button type="button" onClick={onUserRefresh}>Cancel</button><Button type="submit" disabled={profileForm.formState.isSubmitting}>{profileForm.formState.isSubmitting ? "Saving..." : "Save Changes"}</Button></div>
            {profileStatus && <p className={`form-status ${profileStatusIsError ? "form-status--error" : ""}`}>{profileStatus}</p>}
          </form>

          <section className="profile-card order-history">
            <div className="order-history__header">
              <h2>Order History</h2>
              <Button variant="ghost" onClick={() => refetchOrders()} disabled={ordersLoading}>{ordersLoading ? "Refreshing..." : "Refresh"}</Button>
            </div>
            {ordersErrorMessage && <p className="form-status form-status--error">{ordersErrorMessage}</p>}
            {!ordersLoading && !ordersErrorMessage && !orders.length && (
              <p className="order-history__empty">Orders you place will appear here.</p>
            )}
            {orders.map((order) => (
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
