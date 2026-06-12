import { formatMoney } from '../lib/format';
import { resolveProductImage } from '../lib/productUtils';
import type { Cart } from '../types';
import { CartTotals } from './CartTotals';
import { ProductVisual } from './ProductVisual';

type OrderSummaryProps = {
  cart: Cart;
};

export function OrderSummary({ cart }: OrderSummaryProps) {
  return (
    <div className="order-summary">
      {cart.items.map((item) => (
        <div className="order-summary__item" key={item.id}>
          <span className="order-summary__product">
            <ProductVisual src={resolveProductImage(item.product)} type={item.product.image} />
            <span>
              {item.product.name}
              {item.quantity > 1 ? ` x ${item.quantity}` : ''}
            </span>
          </span>
          <strong>{formatMoney(item.lineTotal)}</strong>
        </div>
      ))}
      <CartTotals cart={cart} />
    </div>
  );
}
