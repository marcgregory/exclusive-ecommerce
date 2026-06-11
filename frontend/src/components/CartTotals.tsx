import type { ReactNode } from 'react';
import { formatMoney } from '../lib/format';
import type { Cart } from '../types';

type CartTotalsProps = {
  cart: Cart;
  action?: ReactNode;
};

export function CartTotals({ cart, action }: CartTotalsProps) {
  return (
    <aside className="cart-totals">
      <h3>Cart Total</h3>
      <p>
        <span>Subtotal:</span>
        <strong>{formatMoney(cart.subtotal)}</strong>
      </p>
      <p>
        <span>Shipping:</span>
        <strong>{cart.shipping ? formatMoney(cart.shipping) : 'Free'}</strong>
      </p>
      <p>
        <span>Discount:</span>
        <strong>{formatMoney(cart.discount)}</strong>
      </p>
      <p>
        <span>Total:</span>
        <strong>{formatMoney(cart.total)}</strong>
      </p>
      {action}
    </aside>
  );
}
