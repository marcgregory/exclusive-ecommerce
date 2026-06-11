import { Breadcrumbs } from '../Breadcrumbs';
import { Button } from '../Button';

export function AccountPageSkeleton() {
  return (
    <main className="container page">
      <Breadcrumbs items={['Home', 'My Account']} />
      <p className="welcome">
        Welcome!{' '}
        <strong className="skeleton-text" style={{ width: '100px', height: '18px' }}></strong>
        <strong className="skeleton-text" style={{ width: '100px', height: '18px' }}></strong>
      </p>
      <div className="account-layout">
        <aside className="account-menu">
          <h3>Manage My Account</h3>
          <p className="skeleton-text" style={{ width: '100%', height: '14px' }}></p>
          <p className="skeleton-text" style={{ width: '100%', height: '14px' }}></p>
          <p className="skeleton-text" style={{ width: '100%', height: '14px' }}></p>
          <p className="skeleton-text" style={{ width: '100%', height: '14px' }}></p>
          <h3>My Orders</h3>
          <p className="skeleton-text" style={{ width: '100%', height: '14px' }}></p>
          <h3>My WishList</h3>
        </aside>
        <div className="account-content">
          <form className="profile-card" onSubmit={() => {}}>
            <h2>Edit Your Profile</h2>
            <div className="two-col">
              <div className="skeleton-text" style={{ width: '100%', height: '20px' }}></div>
              <div className="skeleton-text" style={{ width: '100%', height: '20px' }}></div>
              <div className="skeleton-text" style={{ width: '100%', height: '20px' }}></div>
              <div className="skeleton-text" style={{ width: '100%', height: '20px' }}></div>
            </div>
            <div className="password-grid">
              <div className="skeleton-text" style={{ width: '100%', height: '20px' }}></div>
              <div className="skeleton-text" style={{ width: '100%', height: '20px' }}></div>
              <div className="skeleton-text" style={{ width: '100%', height: '20px' }}></div>
            </div>
            <div className="form-actions">
              <Button variant="ghost" onClick={() => {}} disabled>
                Cancel
              </Button>
              <Button type="submit" disabled>
                Saving...
              </Button>
            </div>
          </form>

          {/* Order history skeleton */}
          <section className="profile-card order-history">
            <div className="order-history__header">
              <h2>Order History</h2>
              <Button variant="ghost" disabled>
                Refresh
              </Button>
            </div>
            <div
              className="skeleton-text"
              style={{ width: '100%', height: '20px', marginBottom: '16px' }}
            ></div>
            {[1, 2, 3].map((_, i) => (
              <article className="order-history__row" key={i}>
                <div>
                  <strong
                    className="skeleton-text"
                    style={{ width: '100px', height: '18px' }}
                  ></strong>
                  <span className="skeleton-text" style={{ width: '200px', height: '14px' }}></span>
                  <span className="skeleton-text" style={{ width: '80px', height: '12px' }}></span>
                </div>
                <strong
                  className="skeleton-text"
                  style={{ width: '100px', height: '20px' }}
                ></strong>
                <Button variant="ghost" disabled>
                  View Details
                </Button>
              </article>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
