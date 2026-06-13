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
import { useEffect, useRef, useState } from 'react';
import type { Navigate, PublicUser, AuthStatus } from '../types';
import { NavLink } from './NavLink';

type HeaderProps = {
  currentPath: string;
  navigate: Navigate;
  user: PublicUser | null;
  authStatus: AuthStatus;
  cartCount: number;
  wishlistCount: number;
  onLogout: () => Promise<void>;
  logoutSaving: boolean;
};

export function Header({
  currentPath,
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
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountOpen]);

  useEffect(() => {
    if (!adminOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!adminMenuRef.current?.contains(event.target as Node)) {
        setAdminOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAdminOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [adminOpen]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    setAccountOpen(false);
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
              <NavLink
                key={href}
                href={href}
                currentPath={currentPath}
                navigate={navigate}
                onClick={() => setAccountOpen(false)}
              >
                {label}
              </NavLink>
            ))}
            {authStatus === 'unauthenticated' && (
              <>
                <NavLink
                  href="/signup"
                  currentPath={currentPath}
                  navigate={navigate}
                  onClick={() => setAccountOpen(false)}
                >
                  Sign Up
                </NavLink>
              </>
            )}
            {authStatus === 'authenticated' && user?.role === 'admin' && (
              <div className="admin-dropdown" ref={adminMenuRef}>
                <button
                  className={`admin-trigger ${currentPath.startsWith('/admin') ? 'active' : ''}`}
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
                      <NavLink
                        key={href}
                        href={href}
                        currentPath={currentPath}
                        navigate={navigate}
                        onClick={() => setAdminOpen(false)}
                      >
                        {label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
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
              onClick={() => {
                setAccountOpen(false);
                navigate('/wishlist');
              }}
              aria-label="Wishlist"
            >
              <Heart size={22} />
              {wishlistCount > 0 && <span>{wishlistCount}</span>}
            </button>
            <button
              className="icon-button badge-button"
              onClick={() => {
                setAccountOpen(false);
                navigate('/cart');
              }}
              aria-label="Cart"
            >
              <ShoppingCart size={22} />
              {cartCount > 0 && <span>{cartCount}</span>}
            </button>
            {authStatus === 'authenticated' && user ? (
              <>
                <div className="account-dropdown" ref={accountMenuRef}>
                  <button
                    className="icon-button account-trigger"
                    onClick={() => setAccountOpen((current) => !current)}
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                    aria-controls="account-menu"
                    aria-label="Account menu"
                  >
                    <User size={20} />
                  </button>
                  {accountOpen && (
                    <div className="account-dropdown__menu" id="account-menu" role="menu">
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
          <form className="mobile-search" role="search" onSubmit={submitSearch}>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              aria-label="Search products"
            />
            <button type="submit" aria-label="Search">
              <Search size={20} />
            </button>
          </form>
          {publicLinks.map(([href, label]) => (
            <NavLink
              key={href}
              href={href}
              currentPath={currentPath}
              navigate={navigate}
              onClick={() => setOpen(false)}
            >
              {label}
            </NavLink>
          ))}
          {authStatus === 'authenticated' && user?.role === 'admin' && (
            <>
              {/* In mobile drawer, show admin links as simple buttons */}
              {adminLinks.map(([href, label]) => (
                <NavLink
                  key={href}
                  href={href}
                  currentPath={currentPath}
                  navigate={navigate}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </NavLink>
              ))}
            </>
          )}
          {authStatus === 'unauthenticated' && (
            <>
              <NavLink
                href="/signup"
                currentPath={currentPath}
                navigate={navigate}
                onClick={() => setOpen(false)}
              >
                Sign Up
              </NavLink>
            </>
          )}
          <NavLink
            href="/wishlist"
            currentPath={currentPath}
            navigate={navigate}
            onClick={() => setOpen(false)}
          >
            <span>Wishlist</span>
            {wishlistCount > 0 && <span className="mobile-drawer__count">{wishlistCount}</span>}
          </NavLink>
          {authStatus === 'authenticated' && user ? (
            <>
              <NavLink
                href="/account"
                currentPath={currentPath}
                navigate={navigate}
                onClick={() => setOpen(false)}
              >
                Account
              </NavLink>
              <button onClick={logout} disabled={logoutSaving}>
                Log Out
              </button>
            </>
          ) : null}
          <NavLink
            href="/cart"
            currentPath={currentPath}
            navigate={navigate}
            onClick={() => setOpen(false)}
          >
            <span>Cart</span>
            {cartCount > 0 && <span className="mobile-drawer__count">{cartCount}</span>}
          </NavLink>
        </div>
      )}
    </>
  );
}
