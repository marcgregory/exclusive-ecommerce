import {
  ChevronDown,
  Heart,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  ShoppingCart,
  Star,
  User,
  X,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import type { Navigate, PublicUser, AuthStatus } from '../types';

type HeaderProps = {
  navigate: Navigate;
  user: PublicUser | null;
  authStatus: AuthStatus;
  cartCount: number;
  wishlistCount: number;
  onLogout: () => Promise<void>;
  logoutSaving: boolean;
};

export function Header({
  navigate,
  user,
  authStatus,
  cartCount,
  wishlistCount,
  onLogout,
  logoutSaving,
}: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [adminOpen, setAdminOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const publicLinks = [
    ['/', 'Home'],
    ['/contact', 'Contact'],
    ['/about', 'About'],
  ] as const;
  const adminLinks = [
    ['/admin/products', 'Products'],
    ['/admin/categories', 'Categories'],
    ['/admin/coupons', 'Coupons'],
    ['/admin/orders', 'Orders'],
  ] as const;

  const logout = async () => {
    setOpen(false);
    setAccountOpen(false);
    await onLogout();
  };

  const accountMenuItems = [
    { label: 'Manage My Account', href: '/account', icon: User },
    { label: 'My Order', href: '/account#orders', icon: ShoppingBag },
    { label: 'My Cancellations', href: '/account#cancellations', icon: XCircle },
    { label: 'My Reviews', href: '/account#reviews', icon: Star },
  ] as const;

  return (
    <>
      <header className="site-header">
        <div className="container site-header__inner">
          <button className="logo" onClick={() => navigate('/')}>
            Exclusive
          </button>
          <nav className="desktop-nav">
            {publicLinks.map(([href, label]) => (
              <button key={href} onClick={() => navigate(href)}>
                {label}
              </button>
            ))}
            {authStatus === 'unauthenticated' && (
              <>
                <button onClick={() => navigate('/login')}>Login</button>
                <button onClick={() => navigate('/signup')}>Sign Up</button>
              </>
            )}
            {authStatus === 'authenticated' && user?.role === 'admin' && (
              <>
                <button
                  className="admin-trigger"
                  onClick={() => setAdminOpen(!adminOpen)}
                  aria-label="Admin menu"
                  aria-expanded={adminOpen}
                >
                  Admin
                  <ChevronDown size={16} />
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
              <button type="submit" className="search-box__submit" aria-label="Search">
                <Search size={20} />
              </button>
            </form>
            {/* Wishlist (Heart) - always visible */}
            <button
              className="icon-button badge-button"
              onClick={() => navigate('/wishlist')}
              aria-label="Wishlist"
            >
              <Heart size={22} />
              {wishlistCount > 0 && <span>{wishlistCount}</span>}
            </button>
            <button
              className="icon-button badge-button"
              onClick={() => navigate('/cart')}
              aria-label="Cart"
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && <span>{cartCount}</span>}
            </button>
            {authStatus === 'authenticated' && user ? (
              <>
                <div className="account-dropdown">
                  <button
                    className="icon-button account-trigger"
                    onClick={() => setAccountOpen((current) => !current)}
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                  >
                    <User size={20} />
                  </button>
                  {accountOpen && (
                    <div className="account-dropdown__menu" role="menu">
                      {accountMenuItems.map(({ label, href, icon: Icon }) => (
                        <button
                          key={label}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAccountOpen(false);
                            navigate(href);
                          }}
                        >
                          <Icon size={22} />
                          <span>{label}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={logout}
                        disabled={logoutSaving}
                      >
                        <LogOut size={22} />
                        <span>{logoutSaving ? 'Logging out...' : 'Logout'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : null}
            <button
              className="icon-button mobile-menu"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="mobile-drawer">
          <button
            className="icon-button drawer-close"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
          {publicLinks.map(([href, label]) => (
            <button
              key={href}
              onClick={() => {
                setOpen(false);
                navigate(href);
              }}
            >
              {label}
            </button>
          ))}
          {authStatus === 'authenticated' && user?.role === 'admin' && (
            <>
              {/* In mobile drawer, show admin links as simple buttons */}
              {adminLinks.map(([href, label]) => (
                <button
                  key={href}
                  onClick={() => {
                    setOpen(false);
                    navigate(href);
                  }}
                >
                  {label}
                </button>
              ))}
            </>
          )}
          {authStatus === 'unauthenticated' && (
            <>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/login');
                }}
              >
                Login
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/signup');
                }}
              >
                Sign Up
              </button>
            </>
          )}
          {authStatus === 'authenticated' && user ? (
            <>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/account');
                }}
              >
                Account
              </button>
              <button onClick={logout} disabled={logoutSaving}>
                Log Out
              </button>
            </>
          ) : null}
          <button
            onClick={() => {
              setOpen(false);
              navigate('/cart');
            }}
          >
            Cart
          </button>
        </div>
      )}
    </>
  );
}