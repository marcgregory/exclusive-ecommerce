import { Phone, ShieldCheck, Truck } from "lucide-react";

export function ServiceBadges() {
  return (
    <div className="service-badges">
      <div><Truck /><h4>FREE AND FAST DELIVERY</h4><p>Free delivery for all orders over $140</p></div>
      <div><Phone /><h4>24/7 CUSTOMER SERVICE</h4><p>Friendly 24/7 customer support</p></div>
      <div><ShieldCheck /><h4>MONEY BACK GUARANTEE</h4><p>We return money within 30 days</p></div>
    </div>
  );
}
