import { ShoppingCart } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type AddToCartButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
};

export function AddToCartButton({
  children = 'Add To Cart',
  className = '',
  isLoading = false,
  disabled,
  ...props
}: AddToCartButtonProps) {
  return (
    <button
      type="button"
      className={`add-cart ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      <ShoppingCart size={16} aria-hidden="true" />
      <span>{isLoading ? 'Adding...' : children}</span>
    </button>
  );
}
