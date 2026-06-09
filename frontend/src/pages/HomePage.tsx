import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "../components/Button";
import { CategoryTile } from "../components/CategoryTile";
import { CountdownTimer } from "../components/CountdownTimer";
import { ProductCard } from "../components/ProductCard";
import { SectionHeader } from "../components/SectionHeader";
import { ServiceBadges } from "../components/ServiceBadges";
import type { AddToCart, AddToWishlist, Category, Navigate, Product } from "../types";
import { useRef } from "react";

type HomePageProps = {
  products: Product[];
  categories: Category[];
  navigate: Navigate;
  onAdd: AddToCart;
  onWishlist: AddToWishlist;
  wishlistProductIds: string[];
};

export function HomePage({ products, categories, navigate, onAdd, onWishlist, wishlistProductIds }: HomePageProps) {
  const flash = products.filter((product) => product.flags.includes("flash"));
  const best = products.filter((product) => product.flags.includes("best"));
  const explore = products.filter((product) => product.flags.includes("explore"));
  const productRowRef = useRef<HTMLDivElement>(null);

  return (
    <main>
      <section className="container hero-zone">
        <aside className="category-rail">
          {categories.map((category) => (
            <button key={category.id} onClick={() => navigate(`/category/${category.slug}`)}>
              {category.label}{category.children?.length > 0 && <ChevronRight size={18} />}
            </button>
          ))}
        </aside>
        <div className="hero-card">
          <div><p className="brand-line">iPhone 14 Series</p><h1>Up to 10% off Voucher</h1><button onClick={() => navigate("/category/electronics")}>Shop Now <ArrowRight size={22} /></button></div>
          <div className="hero-phone"><span /><i /></div>
          <div className="dots"><span /><span /><span className="active" /><span /><span /></div>
        </div>
      </section>

      <section className="container section">
        <SectionHeader
          kicker="Today's"
          title="Flash Sales"
          controls
          onLeftScroll={() => productRowRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
          onRightScroll={() => productRowRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
        />
        <div className="section-title-row"><CountdownTimer /></div>
        <div className="product-row" ref={productRowRef}>{flash.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} onWishlist={onWishlist} navigate={navigate} isInWishlist={wishlistProductIds.includes(product.id)} />)}</div>
        <Button className="center-button" onClick={() => navigate("/category/electronics")}>View All Products</Button>
      </section>

      <section className="container section bordered">
        <SectionHeader kicker="Categories" title="Browse By Category" />
        <div className="category-grid">{categories.slice(2, 8).map((category) => <CategoryTile key={category.id} category={category} navigate={navigate} />)}</div>
      </section>

      <section className="container section">
        <SectionHeader kicker="This Month" title="Best Selling Products" action={<Button onClick={() => navigate("/category/electronics")}>View All</Button>} />
        <div className="product-grid four">{best.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} onWishlist={onWishlist} navigate={navigate} isInWishlist={wishlistProductIds.includes(product.id)} />)}</div>
      </section>

      <section className="container promo">
        <div><p>Categories</p><h2>Enhance Your Music Experience</h2><CountdownTimer /><Button>Buy Now!</Button></div>
        <div className="speaker"><span /><i /><b /></div>
      </section>

      <section className="container section">
        <SectionHeader kicker="Our Products" title="Explore Our Products" />
        <div className="product-grid four">{explore.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} onWishlist={onWishlist} navigate={navigate} isInWishlist={wishlistProductIds.includes(product.id)} />)}</div>
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

type FeaturePanelProps = {
  title: string;
  copy: string;
  className?: string;
};

function FeaturePanel({ title, copy, className = "" }: FeaturePanelProps) {
  return <article className={`feature-panel ${className}`}><div className="feature-art"><span /><i /></div><div><h3>{title}</h3><p>{copy}</p><button>Shop Now</button></div></article>;
}
