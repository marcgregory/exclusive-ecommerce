import { Breadcrumbs } from '../Breadcrumbs';
import { Button } from '../Button';

export function OrderDetailSkeleton() {
  return (
    <main className="container page">
      <Breadcrumbs items={['Home', 'My Account', 'Orders', 'Order']} />
      <section className="order-confirmation">
        <div>
          <p className="skeleton-text" style={{ width: '100px', height: '18px' }}></p>
          <h1 className="page-title skeleton-text" style={{ width: '200px', height: '36px' }}>
            Thanks for your purchase.
          </h1>
          <p className="skeleton-text" style={{ width: '100%', height: '21px' }}></p>
          <p className="skeleton-text" style={{ width: '100%', height: '21px' }}></p>
        </div>
        <div className="order-meta">
          <div className="skeleton-text" style={{ width: '100px', height: '20px' }}></div>
          <strong className="skeleton-text" style={{ width: '100px', height: '20px' }}></strong>
          <div className="skeleton-text" style={{ width: '100px', height: '20px' }}></div>
          <strong className="skeleton-text" style={{ width: '100px', height: '20px' }}></strong>
        </div>
      </section>

      <section className="order-detail-layout">
        <div className="order-items-panel">
          <h2>Order Items</h2>
          <div
            className="skeleton-text"
            style={{ width: '100%', height: '20px', marginBottom: '16px' }}
          ></div>
          {[1, 2, 3].map((_, i) => (
            <div className="order-item-row" key={i}>
              <div>
                <strong
                  className="skeleton-text"
                  style={{ width: '100px', height: '18px' }}
                ></strong>
                <span className="skeleton-text" style={{ width: '200px', height: '14px' }}></span>
              </div>
              <strong className="skeleton-text" style={{ width: '100px', height: '20px' }}></strong>
            </div>
          ))}
        </div>

        <aside className="order-side-panel">
          <h2>Order Summary</h2>
          <p>
            <span className="skeleton-text" style={{ width: '100px', height: '16px' }}>
              Subtotal:
            </span>
            <strong className="skeleton-text" style={{ width: '100px', height: '20px' }}></strong>
          </p>
          <p>
            <span className="skeleton-text" style={{ width: '100px', height: '16px' }}>
              Shipping:
            </span>
            <strong className="skeleton-text" style={{ width: '100px', height: '20px' }}></strong>
          </p>
          <p>
            <span className="skeleton-text" style={{ width: '100px', height: '16px' }}>
              Discount:
            </span>
            <strong className="skeleton-text" style={{ width: '100px', height: '20px' }}></strong>
          </p>
          <p>
            <span className="skeleton-text" style={{ width: '100px', height: '16px' }}>
              Total:
            </span>
            <strong className="skeleton-text" style={{ width: '100px', height: '20px' }}></strong>
          </p>
          <h3>Billing</h3>
          <address>
            <p className="skeleton-text" style={{ width: '100%', height: '20px' }}></p>
            <p className="skeleton-text" style={{ width: '100%', height: '20px' }}></p>
            <p className="skeleton-text" style={{ width: '100%', height: '20px' }}></p>
            <p className="skeleton-text" style={{ width: '100%', height: '20px' }}></p>
            <p className="skeleton-text" style={{ width: '100%', height: '20px' }}></p>
          </address>
          <Button variant="ghost" onClick={() => {}} disabled>
            View Order History
          </Button>
        </aside>
      </section>
    </main>
  );
}
