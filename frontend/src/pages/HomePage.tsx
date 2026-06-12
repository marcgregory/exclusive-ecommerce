import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/Button';
import { CategoryTile } from '../components/CategoryTile';
import { CountdownTimer } from '../components/CountdownTimer';
import { ProductCard } from '../components/ProductCard';
import { SectionHeader } from '../components/SectionHeader';
import { ServiceBadges } from '../components/ServiceBadges';
import type { AddToCart, AddToWishlist, Category, Navigate, Product } from '../types';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type HomePageProps = {
  products: Product[];
  categories: Category[];
  navigate: Navigate;
  onAdd: AddToCart;
  onWishlist: AddToWishlist;
  wishlistProductIds: string[];
};

export function HomePage({
  products,
  categories,
  navigate,
  onAdd,
  onWishlist,
  wishlistProductIds,
}: HomePageProps) {
  const flash = products.filter((product) => product.flags.includes('flash'));
  const flashDisplay =
    flash.length >= 5
      ? flash
      : [
          ...flash,
          ...products.filter(
            (product) =>
              !product.flags.includes('flash') &&
              (product.discountPercent > 0 || product.originalPrice > product.price)
          ),
        ].slice(0, 5);
  const best = products.filter((product) => product.flags.includes('best'));
  const explore = products.filter((product) => product.flags.includes('explore'));
  const hero = products.filter((product) => product.flags.includes('hero'));
  const visibleCategories = categories.slice(0, 9);
  const browseCategories = categories.slice(0, 6);

  return (
    <main>
      <section className="home-hero-shell">
        <aside className="category-rail">
          {visibleCategories.map((category) => (
            <button key={category.id} onClick={() => navigate(`/category/${category.slug}`)}>
              <span>{category.label}</span>
              {category.children?.length > 0 && <ChevronRight size={18} />}
            </button>
          ))}
        </aside>
        <HeroCarousel products={hero} navigate={navigate} />
      </section>

      <section className="home-section home-section--flash">
        <ProductCarousel
          products={flashDisplay}
          kicker="Today's"
          title="Flash Sales"
          countdown={<CountdownTimer days={3} />}
          onAdd={onAdd}
          onWishlist={onWishlist}
          navigate={navigate}
          wishlistProductIds={wishlistProductIds}
          viewAllHref="/search?flag=flash"
          viewAllDisabled={flash.length <= 5}
        />
      </section>

      <section className="home-section home-section--bordered">
        <SectionHeader kicker="Categories" title="Browse By Category" />
        <div className="category-grid">
          {browseCategories.map((category) => (
            <CategoryTile key={category.id} category={category} navigate={navigate} />
          ))}
        </div>
      </section>

      <section className="home-section">
        <SectionHeader kicker="This Month" title="Best Selling Products" />
        <div className="product-grid four">
          {best.slice(0, 4).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={onAdd}
              onWishlist={onWishlist}
              navigate={navigate}
              isInWishlist={wishlistProductIds.includes(product.id)}
            />
          ))}
        </div>
      </section>

      <section className="home-section home-section--banner">
        <div className="promo">
          <div>
            <p>Categories</p>
            <h2>Enhance Your Music Experience</h2>
            <CountdownTimer days={5} />
            <Button onClick={() => navigate('/category/electronics')}>Buy Now!</Button>
          </div>
          <div className="promo__art">
            <img src="/assets/home/music-banner-speaker.png" alt="Volt Audio speaker system" />
          </div>
        </div>
      </section>

      <section className="home-section">
        <ProductCarousel
          products={explore}
          kicker="Our Products"
          title="Explore Our Products"
          onAdd={onAdd}
          onWishlist={onWishlist}
          navigate={navigate}
          wishlistProductIds={wishlistProductIds}
          viewAllHref="/search"
          viewAllDisabled={explore.length === 0}
        />
      </section>

      <section className="home-section">
        <SectionHeader kicker="Featured" title="New Arrival" />
        <div className="arrival-grid">
          <FeaturePanel
            className="large feature-panel--ps5"
            title="PlayStation 5"
            copy="Black and White version of the PS5 coming out on sale."
            image="/assets/home/arrival-ps5.png"
            onShop={() => navigate('/category/electronics')}
          />
          <FeaturePanel
            className="feature-panel--women"
            title="Women's Collections"
            copy="Featured woman collections that give you another vibe."
            image="/assets/home/arrival-women.png"
            onShop={() => navigate('/category/womens-fashion')}
          />
          <FeaturePanel
            className="feature-panel--speakers"
            title="Speakers"
            copy="Amazon wireless speakers"
            image="/assets/home/arrival-speakers.png"
            onShop={() => navigate('/category/electronics')}
          />
          <FeaturePanel
            className="feature-panel--perfume"
            title="Perfume"
            copy="GUCCI INTENSE OUD EDP"
            image="/assets/home/arrival-perfume.png"
            onShop={() => navigate('/category/health-beauty')}
          />
        </div>
      </section>
      <div className="home-section home-section--features">
        <ServiceBadges />
      </div>
    </main>
  );
}

type HeroSlide = {
  eyebrow: string;
  title: string;
  href: string;
  image: string;
  alt: string;
};

const heroCopy: Record<string, Pick<HeroSlide, 'eyebrow' | 'title' | 'href'>> = {
  'speaker-boombox': {
    eyebrow: 'Volt Audio',
    title: 'Enhance Your Music Experience',
    href: '/product/speaker-boombox',
  },
  'playstation-5': {
    eyebrow: 'PlayStation 5',
    title: 'New Console Drop',
    href: '/product/playstation-5',
  },
  'canon-camera': {
    eyebrow: 'Canon EOS Series',
    title: 'Creator Gear On Sale',
    href: '/product/canon-camera',
  },
  'gaming-laptop': {
    eyebrow: 'ASUS FHD Gaming',
    title: 'Portable Power Deals',
    href: '/product/gaming-laptop',
  },
  'kids-car': {
    eyebrow: "Baby's & Toys",
    title: 'New Ride-On Arrivals',
    href: '/product/kids-car',
  },
};

const heroPriority = [
  'speaker-boombox',
  'playstation-5',
  'canon-camera',
  'gaming-laptop',
  'kids-car',
];

const fallbackHeroSlides: HeroSlide[] = [
  {
    eyebrow: 'Volt Audio',
    title: 'Enhance Your Music Experience',
    href: '/category/electronics',
    image: '/assets/home/music-banner-speaker.png',
    alt: 'Volt Audio speaker system',
  },
  {
    eyebrow: 'PlayStation 5',
    title: 'New Console Drop',
    href: '/category/electronics',
    image: '/assets/home/arrival-ps5.png',
    alt: 'PlayStation 5 console and controller',
  },
  {
    eyebrow: 'Canon EOS Series',
    title: 'Creator Gear On Sale',
    href: '/product/canon-camera',
    image: '/assets/home/canon-camera.png',
    alt: 'Canon EOS DSLR camera',
  },
];

function HeroCarousel({ products, navigate }: { products: Product[]; navigate: Navigate }) {
  const heroProducts = [...products].sort((left, right) => {
    const leftPriority = heroPriority.indexOf(left.id);
    const rightPriority = heroPriority.indexOf(right.id);
    return (
      (leftPriority === -1 ? Number.MAX_SAFE_INTEGER : leftPriority) -
      (rightPriority === -1 ? Number.MAX_SAFE_INTEGER : rightPriority)
    );
  });
  const slides = heroProducts.length
    ? heroProducts.slice(0, 5).map<HeroSlide>((product) => {
        const copy = heroCopy[product.id] ?? {
          eyebrow: product.name,
          title:
            product.discountPercent > 0
              ? `Up to ${product.discountPercent}% off`
              : 'New Season Pick',
          href: `/product/${product.id}`,
        };

        return {
          ...copy,
          image: product.imageUrl || product.image,
          alt: product.name,
        };
      })
    : fallbackHeroSlides;
  const [active, setActive] = useState(0);
  const slide = slides[active] ?? slides[0];

  const move = (direction: -1 | 1) => {
    setActive((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <div className="hero-card" aria-roledescription="carousel" aria-label="Featured promotions">
      <div className="hero-card__copy">
        <p className="brand-line">{slide.eyebrow}</p>
        <h1>{slide.title}</h1>
        <button onClick={() => navigate(slide.href)}>
          Shop Now <ArrowRight size={22} />
        </button>
      </div>
      <div className="hero-card__image">
        <img src={slide.image} alt={slide.alt} />
      </div>
      {slides.length > 1 && (
        <>
          <div className="hero-card__controls">
            <button onClick={() => move(-1)} aria-label="Previous promotion">
              <ChevronLeft size={22} />
            </button>
            <button onClick={() => move(1)} aria-label="Next promotion">
              <ChevronRight size={22} />
            </button>
          </div>
          <div className="dots" role="tablist" aria-label="Promotion slides">
            {slides.map((item, index) => (
              <button
                key={`${item.href}-${index}`}
                className={index === active ? 'active' : ''}
                onClick={() => setActive(index)}
                aria-label={`Show promotion ${index + 1}`}
                aria-selected={index === active}
                role="tab"
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type ProductCarouselProps = {
  products: Product[];
  kicker: string;
  title: string;
  countdown?: ReactNode;
  onAdd: AddToCart;
  onWishlist: AddToWishlist;
  navigate: Navigate;
  wishlistProductIds: string[];
  viewAllHref: string;
  viewAllDisabled: boolean;
};

function ProductCarousel({
  products,
  kicker,
  title,
  countdown,
  onAdd,
  onWishlist,
  navigate,
  wishlistProductIds,
  viewAllHref,
  viewAllDisabled,
}: ProductCarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const syncScrollState = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
    setCanScrollLeft(carousel.scrollLeft > 2);
    setCanScrollRight(carousel.scrollLeft < maxScrollLeft - 2);
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    syncScrollState();
    carousel.addEventListener('scroll', syncScrollState, { passive: true });
    const resizeObserver = new ResizeObserver(syncScrollState);
    resizeObserver.observe(carousel);

    return () => {
      carousel.removeEventListener('scroll', syncScrollState);
      resizeObserver.disconnect();
    };
  }, [products.length, syncScrollState]);

  const move = (direction: -1 | 1) => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    const firstCard = carousel.querySelector<HTMLElement>('.product-card');
    const distance = firstCard
      ? firstCard.offsetWidth + 30
      : Math.max(240, carousel.clientWidth * 0.85);
    carousel.scrollBy({ left: direction * distance, behavior: 'smooth' });
    window.setTimeout(syncScrollState, 280);
  };

  return (
    <>
      <div className="section-heading-row">
        <SectionHeader
          kicker={kicker}
          title={title}
          controls
          onLeftScroll={() => move(-1)}
          onRightScroll={() => move(1)}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
        />
        {countdown && <div className="section-countdown">{countdown}</div>}
      </div>
      <div className="product-carousel" data-has-controls ref={carouselRef}>
        <div className="product-carousel__track">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAdd={onAdd}
              onWishlist={onWishlist}
              navigate={navigate}
              isInWishlist={wishlistProductIds.includes(product.id)}
            />
          ))}
        </div>
      </div>
      <Button
        className="center-button"
        onClick={() => navigate(viewAllHref)}
        disabled={viewAllDisabled}
      >
        View All Products
      </Button>
    </>
  );
}

type FeaturePanelProps = {
  title: string;
  copy: string;
  image: string;
  className?: string;
  onShop: () => void;
};

function FeaturePanel({ title, copy, image, className = '', onShop }: FeaturePanelProps) {
  return (
    <article className={`feature-panel ${className}`}>
      <div className="feature-art">
        <img src={image} alt="" />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{copy}</p>
        <button onClick={onShop}>Shop Now</button>
      </div>
    </article>
  );
}
