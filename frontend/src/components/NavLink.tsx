import type { ReactNode } from 'react';
import { isActive } from '../lib/isActive';
import type { Navigate } from '../types';

type NavLinkProps = {
  href: string;
  currentPath: string;
  navigate: Navigate;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  onClick?: () => void;
};

export function NavLink({
  href,
  currentPath,
  navigate,
  children,
  className = '',
  activeClassName = 'active',
  onClick,
}: NavLinkProps) {
  const active = isActive(currentPath, href);

  const handleClick = () => {
    if (onClick) onClick();
    navigate(href);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${className} ${active ? activeClassName : ''}`.trim()}
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </button>
  );
}
