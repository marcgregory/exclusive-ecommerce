import React, { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Dumbbell,
  Eye,
  Heart,
  Home,
  Mail,
  Menu,
  Minus,
  Monitor,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  Star,
  Truck,
  User,
  X
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:4000";

type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  originalPrice: number;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  stockStatus: string;
  colors: string[];
  sizes: string[];
  isNew: boolean;
  flags: string[];
  image: string;
};

type Category = {
  id: string;
  label: string;
  slug: string;
  icon: keyof typeof iconMap;
  children?: string[];
};

type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  selectedColor: string;
  selectedSize: string;
  product: Product;
  lineTotal: number;
};

type Cart = {
  id?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
};

type Navigate = (href: string) => void;

type ApiOptions = RequestInit & {
  headers?: Record<string, string>;
};

async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

const iconMap = {
  Dress: Sparkles,
  Shirt,
  Monitor,
  Home,
  Heart,
  Dumbbell: ShieldCheck,
  Gamepad2: CreditCard,
  ShoppingBasket,
  Sparkles
};

function formatMoney(value: number) {
  return `$${Number(value || 0).toFixed(0)}`;
}

function useRoute() {
  const [route, setRoute] = useState(window.location.pathname + window.location.search);
  useEffect(() => {
    const onPop = () => setRoute(window.location.pathname + window.location.search);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (href: string) => {
    window.history.pushState({}, "", href);
    setRoute(window.location.pathname + window.location.search);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return { path: route.split("?")[0], query: new URLSearchParams(route.split("?")[1] || ""), navigate };
}

function TopHeader() {
  return (
    <div className="top-header">
      <div className="top-header__inner">
        <p>Summer Sale For All Swim Suits And Free Express Delivery - OFF 50%!</p>
        <button>ShopNow</button>
        <span>English <ChevronDown size={16} /></span>
      </div>
    </div>
  );
}

function Header({ navigate, cartCount, wishlistCount }) {
  const [open, setOpen] = useState(false);
  const links = [
    ["/", "Home"],
    ["/contact", "Contact"],
    ["/about", "About"],
    ["/account", "Sign Up"]
  ];
  return (
    <>
      <header className="site-header">
        <div className="container site-header__inner">
          <button className="logo" onClick={() => navigate("/")}>Exclusive</button>
          <nav className="desktop-nav">
            {links.map(([href, label]) => <button key={href} onClick={() => navigate(href)}>{label}</button>)}
          </nav>
          <div className="header-actions">
            <label className="search-box">
              <span>What are you looking for?</span>
              <Search size={20} />
            </label>
            <button className="icon-button badge-button" onClick={() => navigate("/wishlist")} aria-label="Wishlist">
              <Heart size={22} />
              {wishlistCount > 0 && <span>{wishlistCount}</span>}
            </button>
            <button className="icon-button badge-button" onClick={() => navigate("/cart")} aria-label="Cart">
              <ShoppingCart size={22} />
              {cartCount > 0 && <span>{cartCount}</span>}
            </button>
            <button className="icon-button" onClick={() => navigate("/account")} aria-label="Account"><User size={22} /></button>
            <button className="icon-button mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={24} /></button>
          </div>
        </div>
      </header>
      {open && (
        <div className="mobile-drawer">
          <button className="icon-button drawer-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button>
          {links.map(([href, label]) => <button key={href} onClick={() => { setOpen(false); navigate(href); }}>{label}</button>)}
          <button onClick={() => { setOpen(false); navigate("/cart"); }}>Cart</button>
          <button onClick={() => { setOpen(false); navigate("/account"); }}>Account</button>
        </div>
      )}
    </>
  );
}

function Footer() {
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

function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
  className = ""
}: {
  children: ReactNode;
  variant?: "primary" | "ghost";
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  className?: string;
}) {
  return <button type={type} className={`button button--${variant} ${className}`} onClick={onClick}>{children}</button>;
}

function Breadcrumbs({ items }) {
  return <div className="breadcrumbs">{items.map((item, index) => <React.Fragment key={item}>{index > 0 && <ChevronRight size={14} />}<span className={index === items.length - 1 ? "active" : ""}>{item}</span></React.Fragment>)}</div>;
}

function SectionHeader({ kicker, title, action, controls = false }: { kicker: string; title: string; action?: ReactNode; controls?: boolean }) {
  return (
    <div className="section-header">
      <div>
        <div className="kicker"><span />{kicker}</div>
        <h2>{title}</h2>
      </div>
      <div className="section-header__actions">{action}{controls && <CarouselControls />}</div>
    </div>
  );
}

function CarouselControls() {
  return <div className="carousel-controls"><button aria-label="Previous"><ArrowLeft size={22} /></button><button aria-label="Next"><ArrowRight size={22} /></button></div>;
}

function Stars({ value = 5 }) {
  return <div className="stars">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={16} fill={star <= Math.round(value) ? "#ffad33" : "none"} color="#ffad33" />)}</div>;
}

function ProductVisual({ type, large = false }) {
  return <div className={`product-visual product-visual--${type || "default"} ${large ? "product-visual--large" : ""}`}><span /><i /><b /></div>;
}

function ProductCard({ product, discount = false, onAdd, onWishlist, navigate }) {
  return (
    <article className="product-card">
      <div className="product-card__media">
        {product.discountPercent > 0 && <span className="discount">-{product.discountPercent}%</span>}
        {product.isNew && <span className="new-badge">NEW</span>}
        <div className="card-tools">
          <button onClick={() => onWishlist(product.id)} aria-label={`Wishlist ${product.name}`}><Heart size={18} /></button>
          <button onClick={() => navigate(`/product/${product.id}`)} aria-label={`View ${product.name}`}><Eye size={18} /></button>
        </div>
        <ProductVisual type={product.image} />
        <button className="add-cart" onClick={() => onAdd(product.id)}>Add To Cart</button>
      </div>
      <button className="product-card__title" onClick={() => navigate(`/product/${product.id}`)}>{product.name}</button>
      <div className="product-card__price"><strong>{formatMoney(product.price)}</strong>{product.originalPrice > 0 && <del>{formatMoney(product.originalPrice)}</del>}</div>
      <div className="product-card__rating"><Stars value={product.rating} /><span>({product.reviewCount})</span></div>
    </article>
  );
}

function CategoryTile({ category, navigate }) {
  const Icon = iconMap[category.icon] || ShoppingBag;
  return <button className="category-tile" onClick={() => navigate(`/category/${category.slug}`)}><Icon size={34} /><span>{category.label}</span></button>;
}

function CountdownTimer() {
  return <div className="countdown">{[["03", "Days"], ["23", "Hours"], ["19", "Minutes"], ["56", "Seconds"]].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>;
}

function ServiceBadges() {
  return (
    <div className="service-badges">
      <div><Truck /><h4>FREE AND FAST DELIVERY</h4><p>Free delivery for all orders over $140</p></div>
      <div><Phone /><h4>24/7 CUSTOMER SERVICE</h4><p>Friendly 24/7 customer support</p></div>
      <div><ShieldCheck /><h4>MONEY BACK GUARANTEE</h4><p>We return money within 30 days</p></div>
    </div>
  );
}

function HomePage({ products, categories, navigate, onAdd, onWishlist }) {
  const flash = products.filter((product) => product.flags.includes("flash"));
  const best = products.filter((product) => product.flags.includes("best"));
  const explore = products.filter((product) => product.flags.includes("explore"));
  return (
    <main>
      <section className="container hero-zone">
        <aside className="category-rail">
          {categories.map((category) => <button key={category.id} onClick={() => navigate(`/category/${category.slug}`)}>{category.label}{category.children?.length > 0 && <ChevronRight size={18} />}</button>)}
        </aside>
        <div className="hero-card">
          <div><p className="brand-line">iPhone 14 Series</p><h1>Up to 10% off Voucher</h1><button onClick={() => navigate("/category/electronics")}>Shop Now <ArrowRight size={22} /></button></div>
          <div className="hero-phone"><span /><i /></div>
          <div className="dots"><span /><span /><span className="active" /><span /><span /></div>
        </div>
      </section>

      <section className="container section">
        <SectionHeader kicker="Today's" title="Flash Sales" controls />
        <div className="section-title-row"><CountdownTimer /></div>
        <div className="product-row">{flash.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} onWishlist={onWishlist} navigate={navigate} />)}</div>
        <Button className="center-button" onClick={() => navigate("/category/electronics")}>View All Products</Button>
      </section>

      <section className="container section bordered">
        <SectionHeader kicker="Categories" title="Browse By Category" controls />
        <div className="category-grid">{categories.slice(2, 8).map((category) => <CategoryTile key={category.id} category={category} navigate={navigate} />)}</div>
      </section>

      <section className="container section">
        <SectionHeader kicker="This Month" title="Best Selling Products" action={<Button onClick={() => navigate("/category/electronics")}>View All</Button>} />
        <div className="product-grid four">{best.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} onWishlist={onWishlist} navigate={navigate} />)}</div>
      </section>

      <section className="container promo">
        <div><p>Categories</p><h2>Enhance Your Music Experience</h2><CountdownTimer /><Button>Buy Now!</Button></div>
        <div className="speaker"><span /><i /><b /></div>
      </section>

      <section className="container section">
        <SectionHeader kicker="Our Products" title="Explore Our Products" controls />
        <div className="product-grid four">{explore.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} onWishlist={onWishlist} navigate={navigate} />)}</div>
        <Button className="center-button">View All Products</Button>
      </section>

      <section className="container section">
        <SectionHeader kicker="Featured" title="New Arrival" />
        <div className="arrival-grid">
          <FeaturePanel className="large" title="PlayStation 5" copy="Black and White version of the PS5 coming out on sale." />
          <FeaturePanel title="Women's Collections" copy="Featured woman collections that give you another vibe." />
          <FeaturePanel title="Speakers" copy="Amazon wireless speakers" />
          <FeaturePanel title="Perfume" copy="GUCCI INTENSE OUD EDP" />
        </div>
      </section>
      <div className="container"><ServiceBadges /></div>
    </main>
  );
}

function FeaturePanel({ title, copy, className = "" }) {
  return <article className={`feature-panel ${className}`}><div className="feature-art"><span /><i /></div><div><h3>{title}</h3><p>{copy}</p><button>Shop Now</button></div></article>;
}

function CategoryPage({ categorySlug, categories, products, navigate, onAdd, onWishlist }) {
  const category = categories.find((entry) => entry.slug === categorySlug);
  const filtered = products.filter((product) => !category || product.category === category.id);
  return (
    <main className="container page">
      <Breadcrumbs items={["Home", category?.label || "Category"]} />
      <SectionHeader kicker="Category" title={category?.label || "All Products"} />
      <div className="product-grid four">{filtered.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} onWishlist={onWishlist} navigate={navigate} />)}</div>
    </main>
  );
}

function ProductDetailsPage({ id, navigate, onAdd, onWishlist }) {
  const [data, setData] = useState(null);
  const [quantity, setQuantity] = useState(2);
  const [size, setSize] = useState("M");
  useEffect(() => { api(`/api/products/${id}`).then(setData).catch(() => api("/api/products/havic-gamepad").then(setData)); }, [id]);
  if (!data) return <main className="container page">Loading...</main>;
  const { product, related } = data;
  return (
    <main className="container page product-detail-page">
      <Breadcrumbs items={["Account", product.category, product.name]} />
      <section className="product-detail">
        <div className="thumbs">{[product.image, "gamepad-black", "gamepad-red", "default"].map((img, index) => <button key={`${img}-${index}`}><ProductVisual type={img} /></button>)}</div>
        <div className="main-product-image"><ProductVisual type={product.image} large /></div>
        <div className="product-info">
          <h1>{product.name}</h1>
          <div className="review-line"><Stars value={product.rating} /><span>({product.reviewCount} Reviews)</span><i /> <strong>{product.stockStatus}</strong></div>
          <p className="detail-price">{formatMoney(product.price)}</p>
          <p className="detail-copy">{product.description}</p>
          <hr />
          <div className="choice-row"><span>Colours:</span>{product.colors.map((color) => <button key={color} className="swatch" style={{ background: color }} aria-label={`Color ${color}`} />)}</div>
          {product.sizes.length > 0 && <div className="choice-row"><span>Size:</span>{product.sizes.map((entry) => <button key={entry} className={entry === size ? "selected size" : "size"} onClick={() => setSize(entry)}>{entry}</button>)}</div>}
          <div className="buy-row"><QuantityStepper value={quantity} onChange={setQuantity} /><Button onClick={() => onAdd(product.id, quantity, product.colors[0], size)}>Buy Now</Button><button className="wishlist-square" onClick={() => onWishlist(product.id)}><Heart /></button></div>
          <div className="delivery-box"><div><Truck /><div><h4>Free Delivery</h4><p>Enter your postal code for Delivery Availability</p></div></div><div><ShieldCheck /><div><h4>Return Delivery</h4><p>Free 30 Days Delivery Returns. Details</p></div></div></div>
        </div>
      </section>
      <section className="section">
        <SectionHeader kicker="Related Item" title="" />
        <div className="product-grid four">{related.map((entry) => <ProductCard key={entry.id} product={entry} onAdd={onAdd} onWishlist={onWishlist} navigate={navigate} />)}</div>
      </section>
    </main>
  );
}

function QuantityStepper({ value, onChange }) {
  return <div className="quantity"><button onClick={() => onChange(Math.max(1, value - 1))}><Minus size={18} /></button><span>{value}</span><button onClick={() => onChange(value + 1)}><Plus size={18} /></button></div>;
}

function CartPage({ cart, navigate, refreshCart }) {
  const [coupon, setCoupon] = useState("");
  const updateQty = async (id, quantity) => { await api(`/api/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ quantity }) }); refreshCart(); };
  const remove = async (id) => { await api(`/api/cart/items/${id}`, { method: "DELETE" }); refreshCart(); };
  return (
    <main className="container page">
      <Breadcrumbs items={["Home", "Cart"]} />
      <div className="cart-table">
        <div className="cart-head"><span>Product</span><span>Price</span><span>Quantity</span><span>Subtotal</span></div>
        {cart.items.map((item) => <div className="cart-row" key={item.id}><div><ProductVisual type={item.product.image} /><button onClick={() => remove(item.id)}><X size={16} /></button><span>{item.product.name}</span></div><span>{formatMoney(item.product.price)}</span><QuantityStepper value={item.quantity} onChange={(qty) => updateQty(item.id, qty)} /><strong>{formatMoney(item.lineTotal)}</strong></div>)}
      </div>
      <div className="cart-actions"><Button variant="ghost" onClick={() => navigate("/")}>Return To Shop</Button><Button variant="ghost" onClick={refreshCart}>Update Cart</Button></div>
      <div className="checkout-strip"><div className="coupon"><input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Coupon Code" /><Button onClick={() => refreshCart(coupon)}>Apply Coupon</Button></div><CartTotals cart={cart} action={<Button onClick={() => navigate("/checkout")}>Proceed to checkout</Button>} /></div>
    </main>
  );
}

function CartTotals({ cart, action }: { cart: Cart; action?: ReactNode }) {
  return <aside className="cart-totals"><h3>Cart Total</h3><p><span>Subtotal:</span><strong>{formatMoney(cart.subtotal)}</strong></p><p><span>Shipping:</span><strong>{cart.shipping ? formatMoney(cart.shipping) : "Free"}</strong></p><p><span>Discount:</span><strong>{formatMoney(cart.discount)}</strong></p><p><span>Total:</span><strong>{formatMoney(cart.total)}</strong></p>{action}</aside>;
}

function CheckoutPage({ cart, refreshCart, navigate }) {
  const [status, setStatus] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const billing = Object.fromEntries(form.entries());
    try {
      await api("/api/orders", { method: "POST", body: JSON.stringify({ billing, paymentMethod: "bank" }) });
      setStatus("Order placed successfully.");
      refreshCart();
    } catch (error) {
      setStatus(error.message);
    }
  };
  return (
    <main className="container page">
      <Breadcrumbs items={["Account", "My Account", "Product", "View Cart", "Checkout"]} />
      <h1 className="page-title">Billing Details</h1>
      <form className="checkout-form" onSubmit={submit}>
        <div className="form-grid">
          {["firstName", "companyName", "streetAddress", "apartment", "townCity", "phone", "email"].map((name) => <FormField key={name} name={name} label={name.replace(/([A-Z])/g, " $1")} required={["firstName", "streetAddress", "townCity", "phone", "email"].includes(name)} />)}
        </div>
        <div><OrderSummary cart={cart} /><Button type="submit">Place Order</Button>{status && <p className="form-status">{status}</p>}</div>
      </form>
    </main>
  );
}

function OrderSummary({ cart }) {
  return <div className="order-summary">{cart.items.map((item) => <p key={item.id}><span>{item.product.name} x {item.quantity}</span><strong>{formatMoney(item.lineTotal)}</strong></p>)}<CartTotals cart={cart} /></div>;
}

function FormField({ label, name, required = false, textarea = false, defaultValue = "" }) {
  return <label className="form-field"><span>{label}{required && <b>*</b>}</span>{textarea ? <textarea name={name} required={required} defaultValue={defaultValue} /> : <input name={name} required={required} defaultValue={defaultValue} />}</label>;
}

function AccountPage() {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("");
  useEffect(() => { api("/api/me").then((data) => setUser(data.user)); }, []);
  const submit = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const data = await api("/api/me", { method: "PATCH", body: JSON.stringify(payload) });
    setUser(data.user);
    setStatus("Profile saved.");
  };
  return (
    <main className="container page">
      <Breadcrumbs items={["Home", "My Account"]} />
      <p className="welcome">Welcome! <strong>{user?.firstName || "Md"} {user?.lastName || "Rimel"}</strong></p>
      <div className="account-layout">
        <aside className="account-menu"><h3>Manage My Account</h3><p>My Profile</p><p>Address Book</p><p>My Payment Options</p><h3>My Orders</h3><p>My Returns</p><p>My Cancellations</p><h3>My WishList</h3></aside>
        <form className="profile-card" onSubmit={submit}><h2>Edit Your Profile</h2><div className="two-col"><FormField label="First Name" name="firstName" defaultValue={user?.firstName} /><FormField label="Last Name" name="lastName" defaultValue={user?.lastName} /><FormField label="Email" name="email" defaultValue={user?.email} /><FormField label="Address" name="address" defaultValue={user?.address} /></div><FormField label="Password Changes" name="password" /><div className="form-actions"><button type="button">Cancel</button><Button type="submit">Save Changes</Button></div>{status && <p>{status}</p>}</form>
      </div>
    </main>
  );
}

function AboutPage() {
  return <main className="page about-page"><div className="container"><Breadcrumbs items={["Home", "About"]} /></div><section className="about-hero"><div className="container about-hero__inner"><div><h1>Our Story</h1><p>Launched in 2015, Exclusive is South Asia's premier online shopping marketplace with an active presence in Bangladesh.</p><p>Exclusive offers a diverse assortment in categories ranging from consumer electronics to lifestyle essentials.</p></div><div className="story-image"><ShoppingBag size={120} /></div></div></section><section className="container stats"><div><strong>10.5k</strong><span>Sellers active our site</span></div><div><strong>33k</strong><span>Monthly product sale</span></div><div><strong>45.5k</strong><span>Customers active in our site</span></div><div><strong>25k</strong><span>Annual gross sale</span></div></section><section className="container team"><TeamCard name="Tom Cruise" role="Founder & Chairman" /><TeamCard name="Emma Watson" role="Managing Director" /><TeamCard name="Will Smith" role="Product Designer" /></section><div className="container"><ServiceBadges /></div></main>;
}

function TeamCard({ name, role }) {
  return <article><div className="team-photo"><User size={110} /></div><h3>{name}</h3><p>{role}</p></article>;
}

function ContactPage() {
  const [status, setStatus] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    try {
      await api("/api/contact", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      setStatus("Message sent.");
      event.currentTarget.reset();
    } catch (error) {
      setStatus(error.message);
    }
  };
  return (
    <main className="container page">
      <Breadcrumbs items={["Home", "Contact"]} />
      <div className="contact-layout">
        <aside className="contact-card"><div><Phone /><h3>Call To Us</h3><p>We are available 24/7, 7 days a week.</p><p>Phone: +8801611112222</p></div><hr /><div><Mail /><h3>Write To US</h3><p>Fill out our form and we will contact you within 24 hours.</p><p>Emails: customer@exclusive.com</p><p>Emails: support@exclusive.com</p></div></aside>
        <form className="contact-form" onSubmit={submit}><div className="three-col"><FormField name="name" label="Your Name" required /><FormField name="email" label="Your Email" required /><FormField name="phone" label="Your Phone" /></div><FormField name="message" label="Your Message" textarea required /><Button type="submit">Send Message</Button>{status && <p>{status}</p>}</form>
      </div>
    </main>
  );
}

function WishlistPage({ navigate, onAdd }) {
  const [products, setProducts] = useState([]);
  useEffect(() => { api("/api/wishlist").then((data) => setProducts(data.products)); }, []);
  return <main className="container page"><Breadcrumbs items={["Home", "Wishlist"]} /><SectionHeader kicker="Wishlist" title={`Wishlist (${products.length})`} /><div className="product-grid four">{products.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} onWishlist={() => {}} navigate={navigate} />)}</div></main>;
}

function App() {
  const { path, navigate } = useRoute();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState({ items: [], subtotal: 0, discount: 0, shipping: 0, total: 0 });
  const [wishlistCount, setWishlistCount] = useState(0);

  const refreshCart = async (coupon = "") => {
    const data = await api(`/api/cart${coupon ? `?coupon=${encodeURIComponent(coupon)}` : ""}`);
    setCart(data.cart);
  };
  const refreshWishlist = async () => {
    const data = await api("/api/wishlist");
    setWishlistCount(data.products.length);
  };
  useEffect(() => {
    api("/api/products").then((data) => setProducts(data.products));
    api("/api/categories").then((data) => setCategories(data.categories));
    refreshCart();
    refreshWishlist();
  }, []);

  const onAdd = async (productId, quantity = 1, selectedColor = "", selectedSize = "") => {
    await api("/api/cart/items", { method: "POST", body: JSON.stringify({ productId, quantity, selectedColor, selectedSize }) });
    refreshCart();
  };
  const onWishlist = async (productId) => {
    await api(`/api/wishlist/${productId}`, { method: "POST" });
    refreshWishlist();
  };

  const page = useMemo(() => {
    if (path.startsWith("/category/")) return <CategoryPage categorySlug={path.split("/").pop()} categories={categories} products={products} navigate={navigate} onAdd={onAdd} onWishlist={onWishlist} />;
    if (path.startsWith("/product/")) return <ProductDetailsPage id={path.split("/").pop()} navigate={navigate} onAdd={onAdd} onWishlist={onWishlist} />;
    if (path === "/cart") return <CartPage cart={cart} navigate={navigate} refreshCart={refreshCart} />;
    if (path === "/checkout") return <CheckoutPage cart={cart} refreshCart={refreshCart} navigate={navigate} />;
    if (path === "/account") return <AccountPage />;
    if (path === "/about") return <AboutPage />;
    if (path === "/contact") return <ContactPage />;
    if (path === "/wishlist") return <WishlistPage navigate={navigate} onAdd={onAdd} />;
    return <HomePage products={products} categories={categories} navigate={navigate} onAdd={onAdd} onWishlist={onWishlist} />;
  }, [path, products, categories, cart]);

  return (
    <>
      <TopHeader />
      <Header navigate={navigate} cartCount={cart.items.reduce((sum, item) => sum + item.quantity, 0)} wishlistCount={wishlistCount} />
      {page}
      <button className="back-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>
      <Footer />
    </>
  );
}

createRoot(document.getElementById("root")).render(<App />);
