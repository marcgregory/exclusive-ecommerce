import { SlidersHorizontal } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

type ChooseOptionsButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function ChooseOptionsButton({
  children = 'Choose Options',
  className = '',
  ...props
}: ChooseOptionsButtonProps) {
  return (
    <button type="button" className={`add-cart ${className}`} {...props}>
      <SlidersHorizontal size={16} aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}
