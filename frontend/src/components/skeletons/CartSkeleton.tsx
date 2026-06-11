import { ProductVisual } from '../ProductVisual';
import { QuantityStepper } from '../QuantityStepper';
import { Button } from '../Button';
import { Breadcrumbs } from '../Breadcrumbs';
import { X } from 'lucide-react';

export function CartSkeleton() {
  return (
    <main className="container page">
      <Breadcrumbs items={['Home', 'Cart']} />
      <div className="cart-table">
        <div className="cart-head">
          <span>Product</span>
          <span>Price</span>
          <span>Quantity</span>
          <span>Subtotal</span>
        </div>
        {/* Skeleton for cart items */}
        {[1, 2, 3].map((_, i) => (
          <div className="cart-row" key={i}>
            <div>
              <ProductVisual src="#" type="placeholder" />
              <button aria-label="Remove product">
                <X size={16} />
              </button>
              <span className="cart-row__product">
                <span className="skeleton-text" style={{ width: '100%', height: '16px' }}></span>
                <span className="cart-row__variants">
                  <span
                    className="skeleton-text"
                    style={{
                      width: '80px',
                      height: '12px',
                      display: 'inline-block',
                      marginRight: '6px',
                    }}
                  ></span>
                  <span
                    className="skeleton-text"
                    style={{ width: '60px', height: '12px', display: 'inline-block' }}
                  ></span>
                </span>
              </span>
            </div>
            <span className="skeleton-text" style={{ width: '80px', height: '20px' }}></span>
            <div className="cart-row__quantity">
              <QuantityStepper value={1} onChange={() => {}} disabled />
            </div>
            <strong className="skeleton-text" style={{ width: '100px', height: '20px' }}></strong>
          </div>
        ))}
      </div>
      <div className="cart-actions">
        <Button variant="ghost" onClick={() => {}} disabled>
          Return To Shop
        </Button>
        <Button variant="ghost" onClick={() => {}} disabled>
          Update Cart
        </Button>
      </div>
      <div className="checkout-strip">
        <div className="coupon">
          <input placeholder="Coupon Code" disabled />
          <Button disabled>{''}</Button>
        </div>
        <div className="cart-totals"></div>
      </div>
    </main>
  );
}
