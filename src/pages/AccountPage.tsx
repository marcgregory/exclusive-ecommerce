import { type FormEvent, useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Button } from "../components/Button";
import { FormField } from "../components/FormField";
import { ErrorState, LoadingState } from "../components/StateViews";
import { getErrorMessage } from "../lib/errors";
import type { AsyncState, MeResponse, PublicUser } from "../types";

export function AccountPage() {
  const [userState, setUserState] = useState<AsyncState<PublicUser | null>>({ data: null, loading: true, error: "" });
  const [status, setStatus] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadUser = useCallback(async () => {
    setUserState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const data = await api<MeResponse>("/api/me");
      setUserState({ data: data.user, loading: false, error: "" });
    } catch (error) {
      setUserState({ data: null, loading: false, error: getErrorMessage(error) });
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      setSaving(true);
      setStatus("");
      setStatusIsError(false);
      const data = await api<MeResponse>("/api/me", { method: "PATCH", body: JSON.stringify(payload) });
      setUserState({ data: data.user, loading: false, error: "" });
      setStatus("Profile saved.");
    } catch (error) {
      setStatusIsError(true);
      setStatus(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (userState.loading) {
    return <main className="container page"><LoadingState title="Loading account" message="We are checking your account." /></main>;
  }

  if (userState.error || !userState.data) {
    return (
      <main className="container page">
        <Breadcrumbs items={["Home", "My Account"]} />
        <ErrorState title="We could not load your account" message={userState.error || "Authentication required"} action={{ label: "Try Again", onClick: loadUser }} />
      </main>
    );
  }

  const user = userState.data;

  return (
    <main className="container page">
      <Breadcrumbs items={["Home", "My Account"]} />
      <p className="welcome">Welcome! <strong>{user.firstName || "Md"} {user.lastName || "Rimel"}</strong></p>
      <div className="account-layout">
        <aside className="account-menu"><h3>Manage My Account</h3><p>My Profile</p><p>Address Book</p><p>My Payment Options</p><h3>My Orders</h3><p>My Returns</p><p>My Cancellations</p><h3>My WishList</h3></aside>
        <form className="profile-card" onSubmit={submit}><h2>Edit Your Profile</h2><div className="two-col"><FormField label="First Name" name="firstName" defaultValue={user.firstName} /><FormField label="Last Name" name="lastName" defaultValue={user.lastName} /><FormField label="Email" name="email" defaultValue={user.email} /><FormField label="Address" name="address" defaultValue={user.address} /></div><FormField label="Password Changes" name="password" /><div className="form-actions"><button type="button">Cancel</button><Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button></div>{status && <p className={`form-status ${statusIsError ? "form-status--error" : ""}`}>{status}</p>}</form>
      </div>
    </main>
  );
}
