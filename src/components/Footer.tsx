import { Send } from "lucide-react";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <h3>Exclusive</h3>
          <h4>Subscribe</h4>
          <p>Get 10% off your first order</p>
          <label className="footer-email">Enter your email <Send size={18} /></label>
        </div>
        <div><h4>Support</h4><p>111 Bijoy sarani, Dhaka, DH 1515, Bangladesh.</p><p>exclusive@gmail.com</p><p>+88015-88888-9999</p></div>
        <div><h4>Account</h4><p>My Account</p><p>Login / Register</p><p>Cart</p><p>Wishlist</p><p>Shop</p></div>
        <div><h4>Quick Link</h4><p>Privacy Policy</p><p>Terms Of Use</p><p>FAQ</p><p>Contact</p></div>
        <div><h4>Download App</h4><p>Save $3 with App New User Only</p><div className="app-badges"><div className="qr">QR</div><div><span>Google Play</span><span>App Store</span></div></div></div>
      </div>
      <p className="copyright">Copyright Rimel 2022. All right reserved</p>
    </footer>
  );
}
