import { formatMoney } from '../lib/format';
import type { Cart } from '../types';
import { CartTotals } from './CartTotals';

type OrderSummaryProps = {
  cart: Cart;
};

export function OrderSummary({ cart }: OrderSummaryProps) {
  return (
    <div className="order-summary">
      {cart.items.map((item) => (
        <p key={item.id}>
          <span>
            {item.product.name} x {item.quantity}
          </span>
          <strong>{formatMoney(item.lineTotal)}</strong>
        </p>
      ))}
      <CartTotals cart={cart} />
    </div>
  );
}
