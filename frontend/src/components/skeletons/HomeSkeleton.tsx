import { CategoryTileSkeleton } from '../CategoryTileSkeleton';
import { ProductCardSkeleton } from '../ProductCardSkeleton';
import { SectionHeader } from '../SectionHeader';
import { CountdownTimerSkeleton } from '../CountdownTimer';
import { ServiceBadges } from '../ServiceBadges';
import { useRef } from 'react';

const categoryTileSkeletons = Array.from({ length: 6 });
const productCardSkeletons = Array.from({ length: 4 });
const productGridSkeletons = Array.from({ length: 12 });
const railSkeletons = Array.from({ length: 8 });

export function HomeSkeleton() {
  const productRowRef = useRef<HTMLDivElement>(null);

  return (
    <main aria-busy="true">
      <section className="home-hero-shell">
        <aside className="category-rail">
          {railSkeletons.map((_, index) => (
            <button key={index} className="category-rail__skeleton-item" disabled>
              <span className="skeleton" />
              {index < 3 && <i className="skeleton" />}
            </button>
          ))}
        </aside>
        <div className="hero-card hero-card--skeleton skeleton-dark-surface">
          <div>
            <p className="skeleton skeleton-dark skeleton-hero-brand" />
            <h1 className="skeleton-heading-stack" aria-hidden="true">
              <span className="skeleton skeleton-dark" />
              <span className="skeleton skeleton-dark" />
            </h1>
            <span className="skeleton skeleton-dark skeleton-hero-link" />
          </div>
          <div className="hero-phone">
            <span className="skeleton-hero-phone-body skeleton-dark" />
            <i className="skeleton-hero-phone-camera skeleton-dark" />
          </div>
          <div className="dots">
            {[1, 2, 3, 4, 5].map((_, index) => (
              <span key={index} className={index === 2 ? 'active' : ''} />
            ))}
          </div>
        </div>
      </section>

      <section className="home-section home-section--flash">
        <div className="section-heading-row">
          <SectionHeader
            kicker="Today's"
            title="Flash Sales"
            controls
            onLeftScroll={() => productRowRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
            onRightScroll={() => productRowRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
          />
          <div className="section-countdown">
            <CountdownTimerSkeleton />
          </div>
        </div>
        <div className="product-carousel" ref={productRowRef}>
          <div className="product-carousel__track">
            {productCardSkeletons.map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="center-button skeleton-button" />
      </section>

      <section className="container section bordered">
        <SectionHeader kicker="Categories" title="Browse By Category" />
        <div className="category-grid">
          {categoryTileSkeletons.map((_, i) => (
            <CategoryTileSkeleton key={i} />
          ))}
        </div>
      </section>

      <section className="container section">
        <SectionHeader
          kicker="This Month"
          title="Best Selling Products"
          action={<div className="center-button skeleton-button" />}
        />
        <div className="product-grid four">
          {productGridSkeletons.map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>

      <section className="container promo promo--skeleton skeleton-dark-surface">
        <div>
          <p className="skeleton skeleton-dark skeleton-promo-kicker" />
          <h2 className="skeleton-heading-stack" aria-hidden="true">
            <span className="skeleton skeleton-dark" />
            <span className="skeleton skeleton-dark" />
          </h2>

          <CountdownTimerSkeleton />
          <span className="skeleton skeleton-green-button" />
        </div>
        <div className="speaker">
          <span />
          <i />
          <b />
        </div>
      </section>

      <section className="container section">
        <SectionHeader kicker="Our Products" title="Explore Our Products" />
        <div className="product-grid four">
          {productGridSkeletons.map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
        <div className="center-button skeleton-button" />
      </section>

      <section className="container section">
        <SectionHeader kicker="Featured" title="New Arrival" />
        <div className="arrival-grid">
          <FeaturePanelSkeleton className="large" />
          <FeaturePanelSkeleton />
          <FeaturePanelSkeleton />
          <FeaturePanelSkeleton />
        </div>
      </section>
      <div className="container">
        <ServiceBadges />
      </div>
    </main>
  );
}

type FeaturePanelSkeletonProps = {
  className?: string;
};

function FeaturePanelSkeleton({ className = '' }: FeaturePanelSkeletonProps) {
  return (
    <article className={`feature-panel feature-panel--skeleton skeleton-dark-surface ${className}`}>
      <div className="feature-art">
        <span />
        <i />
      </div>
      <div>
        <h3 className="skeleton skeleton-dark" />
        <p className="skeleton skeleton-dark" />
        <button className="skeleton skeleton-dark" aria-hidden="true" disabled />
      </div>
    </article>
  );
}
