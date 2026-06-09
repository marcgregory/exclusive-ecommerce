import { ChevronDown, Heart, LogOut, Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { useState } from "react";
import type { Navigate, PublicUser } from "../types";

type HeaderProps = {
  navigate: Navigate;
  user: PublicUser | null;
  cartCount: number;
  wishlistCount: number;
  onLogout: () => Promise<void>;
  logoutSaving: boolean;
};

export function Header({ navigate, user, cartCount, wishlistCount, onLogout, logoutSaving }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [adminOpen, setAdminOpen] = useState(false);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const publicLinks = [
    ["/", "Home"],
    ["/contact", "Contact"],
    ["/about", "About"],
    ["/account", user ? "Account" : "Sign Up"],
  ];
  const adminLinks = [
    ["/admin/products", "Products"],
    ["/admin/categories", "Categories"],
    ["/admin/coupons", "Coupons"],
    ["/admin/orders", "Orders"],
  ];

  const logout = async () => {
    setOpen(false);
    await onLogout();
  };

  return (
    <>
      <header className="site-header">
        <div className="container site-header__inner">
          <button className="logo" onClick={() => navigate("/")}>Exclusive</button>
          <nav className="desktop-nav">
            {publicLinks.map(([href, label]) => <button key={href} onClick={() => navigate(href)}>{label}</button>)}
            {user?.role === "admin" && (
              <>
                <button
                  className="admin-trigger"
                  onClick={() => setAdminOpen(!adminOpen)}
                  aria-label="Admin menu"
                  aria-expanded={adminOpen}
                >
                  Admin<ChevronDown size={16} />
                </button>
                {adminOpen && (
                  <div className="admin-dropdown-menu">
                    {adminLinks.map(([href, label]) => (
                      <button
                        key={href}
                        onClick={() => {
                          setAdminOpen(false);
                          navigate(href);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </nav>
          <div className="header-actions">
            <form className="search-box" role="search" onSubmit={submitSearch}>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="What are you looking for?"
                aria-label="Search products"
              />
              <button type="submit" className="search-box__submit" aria-label="Search"><Search size={20} /></button>
            </form>
            <button className="icon-button badge-button" onClick={() => navigate("/wishlist")} aria-label="Wishlist">
              <Heart size={22} />
              {wishlistCount > 0 && <span>{wishlistCount}</span>}
            </button>
            <button className="icon-button badge-button" onClick={() => navigate("/cart")} aria-label="Cart">
              <ShoppingCart size={22} />
              {cartCount > 0 && <span>{cartCount}</span>}
            </button>
            <button className="icon-button" onClick={() => navigate("/account")} aria-label="Account"><User size={22} /></button>
            {user && (
              <button className="icon-button" onClick={logout} disabled={logoutSaving} aria-label="Log out">
                <LogOut size={21} />
              </button>
            )}
            <button className="icon-button mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={24} /></button>
          </div>
        </div>
      </header>
      {open && (
        <div className="mobile-drawer">
          <button className="icon-button drawer-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button>
          {publicLinks.map(([href, label]) => (
            <button key={href} onClick={() => { setOpen(false); navigate(href); }}>{label}</button>
          ))}
          {user?.role === "admin" && (
            <>
              {/* In mobile drawer, show admin links as simple buttons */}
              {adminLinks.map(([href, label]) => (
                <button key={href} onClick={() => {
                  setOpen(false);
                  navigate(href);
                }}>
                  {label}
                </button>
              ))}
            </>
          )}
          <button onClick={() => { setOpen(false); navigate("/cart"); }}>Cart</button>
          <button onClick={() => { setOpen(false); navigate("/account"); }}>Account</button>
          {user && <button onClick={logout} disabled={logoutSaving}>Log Out</button>}
        </div>
      )}
    </>
  );
}
