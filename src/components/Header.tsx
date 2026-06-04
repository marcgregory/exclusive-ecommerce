import { Heart, LogOut, Menu, Search, ShoppingCart, User, X } from "lucide-react";
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
  const links = [
    ["/", "Home"],
    ["/contact", "Contact"],
    ["/about", "About"],
    ["/account", user ? "Account" : "Sign Up"]
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
            {links.map(([href, label]) => <button key={href} onClick={() => navigate(href)}>{label}</button>)}
          </nav>
          <div className="header-actions">
            <label className="search-box">
              <span>What are you looking for?</span>
              <Search size={20} />
            </label>
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
          {links.map(([href, label]) => (
            <button key={href} onClick={() => { setOpen(false); navigate(href); }}>{label}</button>
          ))}
          <button onClick={() => { setOpen(false); navigate("/cart"); }}>Cart</button>
          <button onClick={() => { setOpen(false); navigate("/account"); }}>Account</button>
          {user && <button onClick={logout} disabled={logoutSaving}>Log Out</button>}
        </div>
      )}
    </>
  );
}
