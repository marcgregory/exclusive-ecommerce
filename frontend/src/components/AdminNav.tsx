import { Button } from './Button';
import { isActive } from '../lib/isActive';
import type { Navigate } from '../types';

type AdminNavProps = {
  currentPath: string;
  navigate: Navigate;
};

export function AdminNav({ currentPath, navigate }: AdminNavProps) {
  const adminLinks = [
    { href: '/admin/products', label: 'Products' },
    { href: '/admin/categories', label: 'Categories' },
    { href: '/admin/coupons', label: 'Coupons' },
    { href: '/admin/orders', label: 'Orders' },
  ] as const;

  return (
    <div className="admin-catalog-nav" aria-label="Admin sections">
      {adminLinks.map(({ href, label }) => {
        const active = isActive(currentPath, href);
        return (
          <Button
            key={href}
            variant={active ? undefined : 'ghost'}
            onClick={() => navigate(href)}
            aria-current={active ? 'page' : undefined}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
