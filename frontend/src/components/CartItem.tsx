import { X } from 'lucide-react';
import { resolveProductImage } from '../lib/productUtils';
import { formatMoney } from '../lib/format';
import type { CartItem as CartLine } from '../types';
import { ProductVisual } from './ProductVisual';
import { QuantityStepper } from './QuantityStepper';

type CartItemProps = {
  item: CartLine;
  compact?: boolean;
  onQuantityChange: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
};

function getOptionLabels(item: CartLine) {
  const options = item.selectedOptions ?? {
    ...(item.selectedColor ? { Color: item.selectedColor } : {}),
    ...(item.selectedSize ? { Size: item.selectedSize } : {}),
  };
  return Object.entries(options).filter(([, value]) => value);
}

export function CartItem({ item, compact = false, onQuantityChange, onRemove }: CartItemProps) {
  const optionLabels = getOptionLabels(item);
  const unitPrice = item.unitPrice ?? item.product.price;

  return (
    <div className={compact ? 'cart-row cart-row--compact' : 'cart-row'}>
      <div>
        <ProductVisual src={resolveProductImage(item.product)} type={item.product.image} />
        <button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.product.name}`}>
          <X size={16} />
        </button>
        <span className="cart-row__product">
          <span>{item.product.name}</span>
          {optionLabels.length > 0 && (
            <span
              className="cart-row__variants"
              aria-label={`Selected options for ${item.product.name}`}
            >
              {optionLabels.map(([label, value]) => (
                <span className="cart-row__variant" key={label}>
                  {label === 'Color' && <i style={{ backgroundColor: value }} aria-hidden="true" />}
                  {label}: {value}
                </span>
              ))}
            </span>
          )}
        </span>
      </div>
      {!compact && <span>{formatMoney(unitPrice)}</span>}
      <div className="cart-row__quantity">
        <QuantityStepper
          value={item.quantity}
          onChange={(quantity) => onQuantityChange(item.id, quantity)}
          decrementLabel={`Decrease ${item.product.name} quantity`}
          incrementLabel={`Increase ${item.product.name} quantity`}
        />
      </div>
      <strong>{formatMoney(item.lineTotal)}</strong>
    </div>
  );
}
