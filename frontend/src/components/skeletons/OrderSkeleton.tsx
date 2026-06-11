import { Button } from '../Button';

export function OrderSkeleton() {
  return (
    <section className="profile-card order-history">
      <div className="order-history__header">
        <h2>Order History</h2>
        <Button variant="ghost" disabled>
          Refreshing
        </Button>
      </div>
      <div
        className="skeleton-text"
        style={{ width: '100%', height: '20px', marginBottom: '16px' }}
      ></div>
      {[1, 2, 3].map((_, i) => (
        <article className="order-history__row" key={i}>
          <div>
            <strong className="skeleton-text" style={{ width: '100px', height: '18px' }}></strong>
            <span className="skeleton-text" style={{ width: '200px', height: '14px' }}></span>
            <span className="skeleton-text" style={{ width: '80px', height: '12px' }}></span>
          </div>
          <strong className="skeleton-text" style={{ width: '100px', height: '20px' }}></strong>
          <Button variant="ghost" disabled>
            View Details
          </Button>
        </article>
      ))}
    </section>
  );
}
