import { X } from 'lucide-react';
import { clearCart, closeCartDrawer, removeItem, updateQuantity } from '../app/cartSlice';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { formatMoney } from '../lib/format';
import type { Navigate } from '../types';
import { Button } from './Button';
import { CartItem } from './CartItem';

type CartDrawerProps = {
  navigate: Navigate;
};

export function CartDrawer({ navigate }: CartDrawerProps) {
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart);

  if (!cart.isDrawerOpen) return null;

  const close = () => dispatch(closeCartDrawer());
  const goToCart = () => {
    close();
    navigate('/cart');
  };

  return (
    <div className="cart-drawer-shell" role="presentation">
      <button className="cart-drawer__scrim" aria-label="Close cart" onClick={close} />
      <aside className="cart-drawer" aria-label="Shopping cart" aria-modal="true" role="dialog">
        <div className="cart-drawer__header">
          <div>
            <span>Shopping Cart</span>
            <strong>{cart.items.reduce((sum, item) => sum + item.quantity, 0)} items</strong>
          </div>
          <button className="icon-button" onClick={close} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>
        {cart.message && <p className="form-status form-status--success">{cart.message}</p>}
        {cart.items.length === 0 ? (
          <div className="cart-drawer__empty">
            <h3>Your cart is empty</h3>
            <Button onClick={close}>Keep Shopping</Button>
          </div>
        ) : (
          <>
            <div className="cart-drawer__items">
              {cart.items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  compact
                  onQuantityChange={(id, quantity) => dispatch(updateQuantity({ id, quantity }))}
                  onRemove={(id) => dispatch(removeItem(id))}
                />
              ))}
            </div>
            <div className="cart-drawer__footer">
              <p>
                <span>Subtotal</span>
                <strong>{formatMoney(cart.subtotal)}</strong>
              </p>
              <div className="cart-drawer__actions">
                <Button variant="ghost" onClick={() => dispatch(clearCart())}>
                  Clear Cart
                </Button>
                <Button onClick={goToCart}>View Cart</Button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
