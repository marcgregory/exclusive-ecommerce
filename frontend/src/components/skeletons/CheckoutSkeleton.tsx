import { Breadcrumbs } from '../Breadcrumbs';
import { Button } from '../Button';
import { FormField } from '../FormField';
import { OrderSummary } from '../OrderSummary';

export function CheckoutSkeleton() {
  return (
    <main className="container page">
      <Breadcrumbs items={['Account', 'My Account', 'Product', 'View Cart', 'Checkout']} />
      <h1 className="page-title skeleton-text" style={{ width: '200px', height: '36px' }}>
        Billing Details
      </h1>
      <form className="checkout-form">
        <div className="form-grid">
          {[
            'firstName',
            'companyName',
            'streetAddress',
            'apartment',
            'townCity',
            'phone',
            'email',
          ].map((name, index) => (
            <FormField
              key={index}
              name={name}
              label={name.replace(/([A-Z])/g, ' $1')}
              disabled={true}
            />
          ))}
        </div>
        <div>
          <OrderSummary
            cart={{ id: '', items: [], subtotal: 0, discount: 0, shipping: 0, total: 0 }}
          />
        </div>
        <Button type="submit" disabled>
          Place Order
        </Button>
      </form>
    </main>
  );
}
